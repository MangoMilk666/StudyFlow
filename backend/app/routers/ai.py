from __future__ import annotations

"""AI 路由（/api/ai/*）。

本文件提供一个最小但可扩展的 AI 对话入口：
- 路由：POST /api/ai/chat
- 能力：LangGraph ReAct Agent（LLM + 工具调用）
- 工具：任务统计 /（预留）Canvas 同步 /（可选）RAG 检索上下文

设计取舍：
- FastAPI 通过 Depends(get_current_user) 注入“当前登录用户”，用于做权限隔离。
- tools 是“可被模型调用的函数”。模型会在需要信息时主动调用，再把工具结果组织成最终回复。
- RAG（检索增强生成）是可选能力：没配置 OPENAI_API_KEY 时直接 503，不影响其它业务 API。
"""

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
    """把前端传入的 history（role/content 列表）转换为 LangChain messages。

    - role=assistant|ai -> AIMessage
    - role=user|human -> HumanMessage
    - 不认识的 role 会跳过
    - 任何导入/转换失败会返回空列表（不阻断主流程）
    """
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
    """给 Agent 工具使用：读取当前用户的任务统计信息。

    返回字段说明：
    - total：任务总数
    - done：已完成任务数（status == "Done"）
    - byStatus：按 status 分组的数量统计
    - totalTimeSpentMinutes：tasks.timeSpent（分钟）总和
    """
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
        # 选择显式报错而不是静默降级：避免用户以为 AI 可用但一直“无响应”
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
        """工具：获取当前用户任务统计（JSON 字符串）。

        工具的返回值统一用字符串，便于 Agent 将其纳入对话上下文。
        """

        return json.dumps(await _get_task_stats(user_id))

    @tool
    async def sync_canvas_assignments(courseIds: list[str] | None = None) -> str:
        """工具：同步 Canvas 作业（预留）。

        说明：
        - 当前版本只返回模拟结果，便于演示 Agent 的“工具调用”能力。
        - 未来可在这里接 app/services/canvas_client.py 实现真实同步。
        """

        return json.dumps({"ok": True, "created": 0, "updated": 0, "skipped": 0, "courseIds": courseIds or []})

    tools = [get_task_stats, sync_canvas_assignments]

    retriever = await get_user_retriever(user_id)
    if retriever is not None:
        @tool
        async def search_user_context(query: str) -> str:
            """工具：RAG 检索用户上下文（tasks/modules）。

            - retriever 由 app/services/rag.py 构建（Chroma + OpenAIEmbeddings）
            - 返回拼接后的文本片段，供 Agent 参考
            """

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

    # create_react_agent 会构建一个“可调用工具”的 Agent Graph。
    # 输入 state: {"messages": [...] }，输出 state 仍包含 messages（含工具调用与最终回复）。
    graph = create_react_agent(
        llm,
        tools,
        prompt="You are StudyFlow AI. Use tools when helpful. Keep responses concise and actionable.",
    )

    try:
        from langchain_core.messages import HumanMessage

        msgs = [*_history_to_messages(history), HumanMessage(content=message)]
        # ainvoke 是异步调用：模型可能在中间触发工具调用，再继续推理。
        state = await graph.ainvoke({"messages": msgs})
        messages = state.get("messages") or []
        last = messages[-1] if messages else None
        reply = getattr(last, "content", None) if last is not None else None
        return {"reply": reply or ""}
    except Exception as e:
        raise ApiError(500, f"AI execution error: {e}")
