from __future__ import annotations

from datetime import datetime, timezone
import re

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
from app.utils.datetime import parse_datetime
from app.utils.mongo import oid_str, serialize_datetime, to_object_id
from pymongo import ReturnDocument

from app.models.module import ModuleOut
from app.routers.tasks import _serialize_task


router = APIRouter()

def _map_llm_error(e: Exception) -> ApiError | None:
    """把 LLM 调用异常映射成更准确的 ApiError。

    说明：
    - OpenAI API 可能返回 401（invalid_api_key）、429（rate limit）等。
    - 这些不是“我们系统的 JWT 401”，否则前端会误以为登录过期并清除登录态。
    - 因此这里统一返回 503/502 等更合适的状态码，同时给出可读消息。
    """

    # 异常对象的结构在不同 SDK/版本里可能不同，因此同时用 str(e) + status_code/status 做兼容解析
    msg = str(e)
    status = getattr(e, "status_code", None) or getattr(e, "status", None)
    try:
        status = int(status) if status is not None else None
    except Exception:
        status = None

    lowered = msg.lower()
    # 这里的 401 是“上游模型服务”的 401，不是我们的 JWT 401（否则会触发前端登出）
    if status == 401 or "invalid_api_key" in lowered or "incorrect api key" in lowered:
        return ApiError(503, "OpenAI API Key 无效：请检查 OPENAI_API_KEY（或 OPENAI_BASE_URL 是否匹配）")
    if status == 429 or "rate limit" in lowered or "quota" in lowered:
        return ApiError(503, "OpenAI 触发限流或额度不足：请稍后重试或检查额度")
    if status is not None and status >= 500:
        return ApiError(502, f"上游模型服务异常：HTTP {status}")
    return None


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
                # ai回复
                out.append(AIMessage(content=content))
            elif role in {"user", "human"}:
                # 用户回复
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
    # 查询不同状态的任务数量
    by_status = await db.tasks.aggregate(
        [
            {"$match": {"userId": user_oid}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
    ).to_list(length=None)
    # 查询已经花费的总时长
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

async def _create_new_task(
    user_id: str,
    title: str,
    priority: str | None = None,
    deadline: str | None = None,
    module: str | None = None,
) -> dict[str, Any]:
    """
    给 Agent 工具使用：为当前用户新建任务记录。
    """
    title = (title or "").strip()
    if not title:
        raise ApiError(400, "title required")
    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    now = datetime.now(timezone.utc)
    created_at = now
    updated_at = now

    user_oid = to_object_id(user_id)
    module_raw = (module or "").strip()
    module_oid = None
    module_name = ""

    if module_raw:
        # 按照传参名称检索module
        if re.fullmatch(r"[0-9a-fA-F]{24}", module_raw):
            candidate_oid = to_object_id(module_raw)
            module_doc = await db.modules.find_one({"_id": candidate_oid, "userId": user_oid})
            if not module_doc:
                raise ApiError(400, "module not found")
            module_oid = candidate_oid
            module_name = str(module_doc.get("name") or "")
        # 检索不到，自动创建一个module记录
        else:
            cleaned = module_raw
            module_doc = await db.modules.find_one_and_update(
                {"userId": user_oid, "name": {"$regex": f"^{re.escape(cleaned)}$", "$options": "i"}},
                {
                    "$setOnInsert": {
                        "userId": user_oid,
                        "name": cleaned,
                        "colorCode": "#3f51b5",
                        "description": "",
                        "createdAt": created_at,
                        "updatedAt": updated_at,
                    }
                },
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
            module_oid = module_doc.get("_id") if module_doc else None
            module_name = str((module_doc or {}).get("name") or cleaned)

    normalized_priority = (priority or "").strip().lower()
    priority_value = "Medium"
    if normalized_priority in {"low", "l"}:
        priority_value = "Low"
    elif normalized_priority in {"medium", "m"}:
        priority_value = "Medium"
    elif normalized_priority in {"high", "h"}:
        priority_value = "High"

    doc: dict = {
        "userId": user_oid,
        "title": title,
        "description": "",
        "priority": priority_value,
        "deadline": parse_datetime(deadline),
        "module": module_oid,
        "moduleName": module_name,
        "status": "To Do",
        "source": {"type": "ai"},
        "timeSpent": 0,
        "subtasks": [],
        "createdAt": created_at,
        "updatedAt": updated_at,
        "unlockAt": None,
    }
    doc = {k: v for k, v in doc.items() if v is not None or k in {"module", "deadline", "unlockAt"}}
    result = await db.tasks.insert_one(doc)
    created = await db.tasks.find_one({"_id": result.inserted_id})
    created = created or {**doc, "_id": result.inserted_id}

    mod_doc = None
    if created.get("module") is not None:
        module_doc = await db.modules.find_one({"_id": created.get("module")})
        if module_doc:
            mod_doc = ModuleOut(
                _id=oid_str(module_doc.get("_id")),
                userId=oid_str(module_doc.get("userId")),
                name=str(module_doc.get("name") or ""),
                colorCode=module_doc.get("colorCode"),
                description=module_doc.get("description"),
                createdAt=serialize_datetime(module_doc.get("createdAt")),
                updatedAt=serialize_datetime(module_doc.get("updatedAt")),
            ).model_dump(by_alias=True)
    return _serialize_task(created, mod_doc)


@router.get("/health")
async def ai_health(current_user: dict = Depends(get_current_user)):
    settings = get_settings()
    user_id = current_user["userId"]

    llm_configured = bool(settings.OPENAI_API_KEY or getattr(settings, "OPENAI_BASE_URL", None))
    out: dict[str, Any] = {
        "llmConfigured": llm_configured,
        "openaiBaseUrl": getattr(settings, "OPENAI_BASE_URL", None),
        "openaiModel": getattr(settings, "OPENAI_MODEL", None),
        "openaiEmbedModel": getattr(settings, "OPENAI_EMBED_MODEL", None),
        "chromaPersistDir": getattr(settings, "CHROMA_PERSIST_DIR", None),
        "rag": {"enabled": False},
    }
    if not llm_configured:
        return out

    try:
        retriever = await get_user_retriever(user_id)
    except Exception as e:
        out["rag"] = {"enabled": False, "error": str(e)}
        return out

    if retriever is None:
        out["rag"] = {"enabled": False}
        return out

    try:
        if hasattr(retriever, "aget_relevant_documents"):
            docs = await retriever.aget_relevant_documents("studyflow")
        else:
            docs = retriever.get_relevant_documents("studyflow")
        previews = []
        for d in docs or []:
            previews.append(str(getattr(d, "page_content", None) or str(d))[:160])
        out["rag"] = {"enabled": True, "queryOk": True, "sampleCount": len(docs or []), "sample": previews[:3]}
        return out
    except Exception as e:
        out["rag"] = {"enabled": True, "queryOk": False, "error": str(e)}
        return out


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

    # settings 做成单例：避免每个请求都重复读取/解析环境变量
    settings = get_settings()
    message = str((payload or {}).get("message") or "").strip()
    history = (payload or {}).get("history")
    if not message:
        raise ApiError(400, "message required")

    if not settings.OPENAI_API_KEY and not getattr(settings, "OPENAI_BASE_URL", None):
        # 选择显式报错而不是静默降级：避免用户以为 AI 可用但一直“无响应”
        raise ApiError(503, "LLM not configured: missing OPENAI_API_KEY (or OPENAI_BASE_URL for local providers)")

    try:
        # 这些依赖是“可选能力”：没装 langchain 相关包时不影响其它业务 API
        from langchain_core.tools import tool
        from langchain_openai import ChatOpenAI
        from langgraph.prebuilt import create_react_agent
    except Exception as e:
        raise ApiError(500, f"LangChain import error: {e}")

    # user_id 只来自 JWT，不信任前端传参，用于做权限隔离（工具查询时只查自己的数据）
    user_id = current_user["userId"]

    @tool
    async def get_task_stats() -> str:
        """工具：获取当前用户任务统计（JSON 字符串）。

        工具的返回值统一用字符串，便于 Agent 将其纳入对话上下文。
        """

        # 工具返回统一用字符串：避免 Agent 在不同工具之间处理“结构化对象”的兼容问题
        return json.dumps(await _get_task_stats(user_id))

    @tool
    async def sync_canvas_assignments(courseIds: list[str] | None = None) -> str:
        """工具：同步 Canvas 作业（预留）。

        说明：
        - 当前版本只返回模拟结果，便于演示 Agent 的“工具调用”能力。
        - 未来可在这里接 app/services/canvas_client.py 实现真实同步。
        """

        return json.dumps({"ok": True, "created": 0, "updated": 0, "skipped": 0, "courseIds": courseIds or []})

    @tool
    async def create_new_task(
        title: str,
        priority: str | None = None,
        deadline: str | None = None,
        module: str | None = None,
    ) -> str:
        """
        工具函数：创建新的任务记录
        和后端已经编写的接口逻辑一致
        """
        try:
            task = await _create_new_task(user_id, title, priority, deadline, module)
            return json.dumps({"ok": True, "task": task})
        except ApiError as e:
            return json.dumps({"ok": False, "error": e.message, "status": e.status_code})
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e), "status": 500})



    tools = [get_task_stats, sync_canvas_assignments, create_new_task]

    # RAG 是可选增强：retriever 构建失败/不可用时，仍然保留基础对话与工具能力
    retriever = await get_user_retriever(user_id)
    if retriever is not None:
        @tool
        async def search_user_context(query: str) -> str:
            """工具：RAG 检索用户上下文（tasks/modules）。

            - retriever 由 app/services/rag.py 构建（Chroma + OpenAIEmbeddings）
            - 返回拼接后的文本片段，供 Agent 参考
            """

            # 兼容不同 retriever 实现：有的提供 async API，有的只有 sync API
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

    # Ollama/OpenAI-compatible provider 往往不要求真实 key，但 SDK 仍可能要求传 api_key 这个参数
    llm_kwargs: dict[str, Any] = {
        "api_key": settings.OPENAI_API_KEY or "ollama",
        "model": settings.OPENAI_MODEL,
        "temperature": 0,
    }
    if getattr(settings, "OPENAI_BASE_URL", None):
        # 允许切到本地/国内兼容平台（例如 Ollama 的 /v1）
        llm_kwargs["base_url"] = settings.OPENAI_BASE_URL
    try:
        llm = ChatOpenAI(**llm_kwargs)
    except TypeError:
        # 兼容旧版本 SDK：不支持 base_url 参数时就忽略（避免启动直接崩）
        llm_kwargs.pop("base_url", None)
        llm = ChatOpenAI(**llm_kwargs)

    # create_react_agent 会构建一个“可调用工具”的 Agent Graph。
    # 输入 state: {"messages": [...] }，输出 state 仍包含 messages（含工具调用与最终回复）。
    graph = create_react_agent(
        llm,
        tools,
        prompt="You are StudyFlow AI. Use tools when helpful to answer questions or perform requested actions. Do not claim actions happened unless a tool call succeeded. Keep responses concise and actionable.",
    )

    try:
        from langchain_core.messages import HumanMessage

        # 把 history 交给模型：让它“记住”上下文（否则每次都是单轮问答）
        msgs = [*_history_to_messages(history), HumanMessage(content=message)]
        # ainvoke 是异步调用：模型可能在中间触发工具调用，再继续推理。
        state = await graph.ainvoke({"messages": msgs})
        messages = state.get("messages") or []
        last = messages[-1] if messages else None
        # ReAct agent 的最终回复通常在最后一条 AIMessage 里
        reply = getattr(last, "content", None) if last is not None else None
        return {"reply": reply or ""}
    except ApiError as e:
        raise e
    except Exception as e:
        mapped = _map_llm_error(e)
        if mapped is not None:
            raise mapped
        raise ApiError(500, f"AI execution error: {e}")
