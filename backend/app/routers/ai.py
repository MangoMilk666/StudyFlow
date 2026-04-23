from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Body, Depends

from app.config import get_settings
from app.deps import get_current_user
from app.errors import ApiError
from app.services.db import MongoNotReadyError, get_db_checked
from app.services.rag import get_user_retriever
from app.utils.mongo import to_object_id


router = APIRouter()


def _history_to_messages(history: list[dict[str, Any]] | None):
    if not history:
        return []
    try:
        from langchain_core.messages import AIMessage, HumanMessage

        out = []
        for h in history:
            role = (h.get("role") or "").lower()
            content = str(h.get("content") or "")
            if role in {"assistant", "ai"}:
                out.append(AIMessage(content=content))
            elif role in {"user", "human"}:
                out.append(HumanMessage(content=content))
        return out
    except Exception:
        return []


async def _get_task_stats(user_id: str) -> dict[str, Any]:
    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    user_oid = to_object_id(user_id)
    total = await db.tasks.count_documents({"userId": user_oid})
    done = await db.tasks.count_documents({"userId": user_oid, "status": "Done"})
    by_status = await db.tasks.aggregate(
        [
            {"$match": {"userId": user_oid}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
    ).to_list(length=None)
    total_time = await db.tasks.aggregate(
        [
            {"$match": {"userId": user_oid}},
            {"$group": {"_id": None, "minutes": {"$sum": "$timeSpent"}}},
        ]
    ).to_list(length=1)

    return {
        "total": total,
        "done": done,
        "byStatus": {str(x.get("_id") or "Unknown"): int(x.get("count") or 0) for x in by_status},
        "totalTimeSpentMinutes": float((total_time[0].get("minutes") if total_time else 0) or 0),
    }


@router.post("/chat")
async def chat(
    payload: dict = Body(default_factory=dict),
    current_user: dict = Depends(get_current_user),
):
    """AI 对话入口（/api/ai/chat）。

    设计：
    - 使用 LangGraph 的 ReAct agent（工具调用 + 生成回复）
    - tools:
      - get_task_stats：读取用户任务统计
      - sync_canvas_assignments：预留接口（当前返回模拟结果）
      - search_user_context：RAG 检索用户 tasks/modules（需要 OPENAI_API_KEY 才启用）
    - 输入：{ message, history? }
    - 输出：{ reply }
    """

    settings = get_settings()
    message = str((payload or {}).get("message") or "").strip()
    history = (payload or {}).get("history")
    if not message:
        raise ApiError(400, "message required")

    if not settings.OPENAI_API_KEY:
        raise ApiError(503, "OpenAI not configured: missing OPENAI_API_KEY")

    try:
        from langchain_core.tools import tool
        from langchain_openai import ChatOpenAI
        from langgraph.prebuilt import create_react_agent
    except Exception as e:
        raise ApiError(500, f"LangChain import error: {e}")

    user_id = current_user["userId"]

    @tool
    async def get_task_stats() -> str:
        """Get the current user's task completion stats as JSON."""

        return json.dumps(await _get_task_stats(user_id))

    @tool
    async def sync_canvas_assignments(courseIds: list[str] | None = None) -> str:
        """Placeholder for syncing Canvas assignments; returns a simulated result."""

        return json.dumps({"ok": True, "created": 0, "updated": 0, "skipped": 0, "courseIds": courseIds or []})

    tools = [get_task_stats, sync_canvas_assignments]

    retriever = await get_user_retriever(user_id)
    if retriever is not None:
        @tool
        async def search_user_context(query: str) -> str:
            """Search the user's tasks/modules for relevant context."""

            try:
                if hasattr(retriever, "aget_relevant_documents"):
                    docs = await retriever.aget_relevant_documents(query)
                else:
                    docs = retriever.get_relevant_documents(query)
            except Exception:
                return ""

            parts = []
            for d in docs or []:
                content = getattr(d, "page_content", None) or str(d)
                parts.append(content)
            return "\n\n".join(parts[:6])

        tools.append(search_user_context)

    llm = ChatOpenAI(api_key=settings.OPENAI_API_KEY, model=settings.OPENAI_MODEL, temperature=0)

    graph = create_react_agent(
        llm,
        tools,
        prompt="You are StudyFlow AI. Use tools when helpful. Keep responses concise and actionable.",
    )

    try:
        from langchain_core.messages import HumanMessage

        msgs = [*_history_to_messages(history), HumanMessage(content=message)]
        state = await graph.ainvoke({"messages": msgs})
        messages = state.get("messages") or []
        last = messages[-1] if messages else None
        reply = getattr(last, "content", None) if last is not None else None
        return {"reply": reply or ""}
    except Exception as e:
        raise ApiError(500, f"AI execution error: {e}")
