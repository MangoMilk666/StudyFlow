from __future__ import annotations

from datetime import datetime, timezone
import re


"""AI 路由（/api/ai/*）。

本文件提供一个最小但可扩展的 AI 对话入口：
- 路由：POST /api/ai/chat
- 能力：LangGraph ReAct Agent（LLM + 工具调用）
- 工具：任务统计 /（预留）Canvas 同步 /（可选）RAG 检索上下文

设计取舍：
- FastAPI 通过 Depends(get_current_user) 注入"当前登录用户"，用于做权限隔离。
- tools 是"可被模型调用的函数"。模型会在需要信息时主动调用，再把工具结果组织成最终回复。
- RAG（检索增强生成）是可选能力：没配置 OPENAI_API_KEY 时直接 503，不影响其它业务 API。
"""

import json
from typing import Any

import httpx
from fastapi import APIRouter, Body, Depends

from app.config import get_settings
from app.deps import get_current_user
from app.errors import ApiError
from app.services.canvas_client import (
    CanvasNotConfiguredError,
    _get_auth_headers,
    canvas_base_url,
    html_to_text,
    list_assignments,
    list_courses,
)
from app.services.db import MongoNotReadyError, get_db_checked
from app.services.user_ai_config import get_user_ai_config
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
    - 这些不是"我们系统的 JWT 401"，否则前端会误以为登录过期并清除登录态。
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
    # 这里的 401 是"上游模型服务"的 401，不是我们的 JWT 401（否则会触发前端登出）
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

def _coerce_client_datetime(value: str | None, *, fallback: datetime) -> datetime:
    dt = parse_datetime(value)
    if dt is None:
        return fallback
    if dt.tzinfo is None:
        local_tz = datetime.now().astimezone().tzinfo
        if local_tz is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.replace(tzinfo=local_tz).astimezone(timezone.utc)
    return dt.astimezone(timezone.utc)


async def _get_task_stats(user_id: str) -> dict[str, Any]:
    """给 Agent 工具使用：读取当前用户的任务统计信息。

    返回字段说明：
    - total：任务总数
    - done：已完成任务数（status == "Done"）
    - byModuleDetail: 按任务归属的module和任务状态统计
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
    # 查询归属于不同module的不同状态的任务数量
    # 一般用户一次最多允许查询20个module，后续可更改
    by_Module_and_Status = await db.tasks.aggregate([
        {"$match": {"userId": user_oid}},
        {   # 复合id分组
            "$group": {
                "_id": {
                    "module": "$moduleName",
                    "status": "$status"
                },
                "count": {"$sum": 1}
            }
        },
        {
            "$project": {
                "_id": 0,
                # 取别名，将_id.module, _id.status分别映射为module, status
                "module": {"$ifNull": ["$_id.module", "Uncategorized"]},
                "status": "$_id.status",
                "count": 1
            }
        },
        {"$sort": {"module": 1, "status": 1}}
    ]).to_list(length=20)

    # 处理复合分组后的 by_Module_and_Status, 嵌套字典
    module_stats = {}
    for item in by_Module_and_Status:
        m_name = str(item.get("module") or "Uncategorized")
        status = str(item.get("status") or "Unknown")
        count = int(item.get("count") or 0)

        # 如果模块名不在字典里，先初始化它
        if m_name not in module_stats:
            module_stats[m_name] = {}

        # 填充对应状态的数量
        module_stats[m_name][status] = count

    return {
        "total": total,
        "done": done,
        "byModuleDetail": module_stats,
        "byStatus": {str(x.get("_id") or "Unknown"): int(x.get("count") or 0) for x in by_status},
        "totalTimeSpentMinutes": float((total_time[0].get("minutes") if total_time else 0) or 0),
    }

async def _create_new_task(
    user_id: str,
    title: str,
    priority: str | None = None,
    deadline: str | None = None,
    module: str | None = None,
    *,
    created_at: datetime | None = None,
    updated_at: datetime | None = None,
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
    created_at = created_at or now
    updated_at = updated_at or created_at

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

async def _sync_canvas_assignments(
    user_id: str,
    course_filter: list[str],
    import_to_tasks: bool = False,
) -> dict:
    """给 Agent 工具使用：拉取 Canvas 课程作业，可选写入 tasks 数据库。

    参数：
    - course_filter：课程名称/代码/ID 关键词列表，None 表示全部课程。
                     匹配规则：关键词是课程名或 course_code 的子串（大小写不敏感），或等于课程 ID。
    - import_to_tasks：True 时同时把作业幂等写入 tasks 集合。

    返回 dict：
    {
        "ok": True,
        "courses": [
            {
                "courseId": "...",
                "courseName": "...",
                "assignments": [{"assignmentId": "...", "name": "...", "deadline": "YYYY-MM-DD" | null}]
            }
        ],
        "imported": {"created": N, "updated": N}   # 仅当 import_to_tasks=True 时出现
    }
    失败时返回 {"ok": False, "error": "..."}。
    """
    try:
        async with httpx.AsyncClient(
            base_url=canvas_base_url(),
            headers=_get_auth_headers(),
            timeout=10.0,
        ) as client:
            all_courses = await list_courses(client)

            # 按关键词过滤课程（名称/课程代码子串匹配，或课程 ID 精确匹配）
            if course_filter:
                filters = [str(f).strip().lower() for f in course_filter if f]
                selected = [
                    c for c in all_courses
                    if any(
                        f in str(c.get("name") or "").lower()
                        or f in str(c.get("course_code") or "").lower()
                        or f == str(c.get("id") or "")
                        for f in filters
                    )
                ]
                if not selected:
                    available = [str(c.get("name") or "") for c in all_courses]
                    return {
                        "ok": False,
                        "error": f"No courses matched {course_filter}. Available courses: {available}",
                    }
            else:
                selected = all_courses

            # 拉取每门课程的作业列表（保留 raw 数据供后续入库使用）
            # 注意：部分课程即使能出现在 /courses 列表里，也可能因为权限/可见性限制导致 /assignments 返回 403。
            # 这里按课程粒度容错，避免“一门课 403 导致全量失败”。
            entries: list[dict] = []
            for course in selected:
                try:
                    raw = await list_assignments(client, course.get("id"))
                    entries.append({"course": course, "raw": raw, "error": None})
                except httpx.HTTPStatusError as e:
                    status = getattr(e.response, "status_code", 0)
                    try:
                        body = (e.response.text or "").strip()[:200]
                    except Exception:
                        body = ""
                    msg = f"HTTP {status}"
                    if body:
                        msg += f" | {body}"
                    entries.append({"course": course, "raw": [], "error": msg})

    except CanvasNotConfiguredError as e:
        return {"ok": False, "error": f"Canvas not configured: {e}"}
    except httpx.HTTPStatusError as e:
        status = getattr(e.response, "status_code", 0)
        try:
            body = (e.response.text or "").strip()[:300]
        except Exception:
            body = ""
        detail = f"Canvas API HTTP {status}"
        if body:
            detail += f" | Canvas says: {body}"
        if status in (401, 403):
            detail += " | Hint: Token may be invalid, expired, or missing required scopes. Check CANVAS_TOKEN in .env."
        return {"ok": False, "error": detail}
    except Exception as e:
        return {"ok": False, "error": str(e)}

    # 构建展示结构（deadline 统一格式化为 YYYY-MM-DD）
    courses_out: list[dict] = []
    for entry in entries:
        course = entry["course"]
        assignments_out: list[dict] = []
        for a in entry["raw"]:
            title = str(a.get("name") or "").strip()
            if not title:
                continue
            due_at = a.get("due_at")
            deadline_str: str | None = None
            if due_at:
                try:
                    dt = datetime.fromisoformat(str(due_at).replace("Z", "+00:00"))
                    deadline_str = dt.strftime("%Y-%m-%d")
                except Exception:
                    deadline_str = str(due_at)[:10] if len(str(due_at)) >= 10 else None
            assignments_out.append({
                "assignmentId": str(a.get("id") or ""),
                "name": title,
                "deadline": deadline_str,
            })
        courses_out.append({
            "courseId": str(course.get("id") or ""),
            "courseName": str(course.get("name") or ""),
            "assignments": assignments_out,
            "error": entry.get("error"),
        })

    result: dict = {"ok": True, "courses": courses_out}

    if not import_to_tasks:
        return result

    # 写入 tasks 数据库（幂等：以 source.type/courseId/assignmentId 为唯一键）
    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        result["imported"] = {"error": "MongoDB connection failed"}
        return result

    user_oid = to_object_id(user_id)
    created = 0
    updated = 0

    for entry in entries:
        course = entry["course"]
        course_id = str(course.get("id") or "")
        course_name = str(course.get("name") or "")

        for a in entry["raw"]:
            assignment_id = str(a.get("id") or "")
            title = str(a.get("name") or "").strip()
            if not assignment_id or not title:
                continue

            description = html_to_text(a.get("description"))
            deadline = parse_datetime(a.get("due_at"))
            unlock_at = parse_datetime(a.get("unlock_at"))
            now = datetime.now(timezone.utc)

            update_doc: dict = {
                "userId": user_oid,
                "title": title,
                "description": description,
                "deadline": deadline,
                "moduleName": course_name,
                "priority": "Medium",
                "status": "To Do",
                "source": {"type": "canvas", "courseId": course_id, "assignmentId": assignment_id},
                "updatedAt": now,
            }
            if unlock_at is not None:
                update_doc["unlockAt"] = unlock_at

            existing = await db.tasks.find_one({
                "userId": user_oid,
                "source.type": "canvas",
                "source.courseId": course_id,
                "source.assignmentId": assignment_id,
            })
            if existing:
                await db.tasks.update_one({"_id": existing.get("_id")}, {"$set": update_doc})
                updated += 1
            else:
                await db.tasks.insert_one({
                    **update_doc,
                    "createdAt": now,
                    "timeSpent": 0,
                    "subtasks": [],
                })
                created += 1

    result["imported"] = {"created": created, "updated": updated}
    return result

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
    client_now_raw = (payload or {}).get("clientNow")
    if not message:
        raise ApiError(400, "message required")

    user_id = current_user["userId"]
    try:
        user_ai = await get_user_ai_config(user_id)
    except Exception:
        user_ai = {"usePersonalKey": False, "apiKey": None, "model": None}
    effective_key = user_ai.get("apiKey") or settings.OPENAI_API_KEY
    if not effective_key and not getattr(settings, "OPENAI_BASE_URL", None):
        raise ApiError(503, "LLM not configured")

    try:
        # 这些依赖是"可选能力"：没装 langchain 相关包时不影响其它业务 API
        from langchain_core.tools import tool
        from langchain_openai import ChatOpenAI
        from langgraph.prebuilt import create_react_agent
    except Exception as e:
        raise ApiError(500, f"LangChain import error: {e}")

    now = datetime.now(timezone.utc)
    client_now = _coerce_client_datetime(str(client_now_raw) if client_now_raw is not None else None, fallback=now)

    @tool
    async def get_task_stats() -> str:
        """工具：获取当前用户任务统计（JSON 字符串）。

        工具的返回值统一用字符串，便于 Agent 将其纳入对话上下文。
        """

        # 工具返回统一用字符串：避免 Agent 在不同工具之间处理"结构化对象"的兼容问题
        return json.dumps(await _get_task_stats(user_id))

    @tool
    async def sync_canvas_assignments(
        course_filter: list[str] | None = None,
        import_to_tasks: bool = False,
    ) -> str:
        """工具：拉取当前用户的 Canvas 课程作业列表，可选写入 tasks。

        参数：
        - course_filter: 要筛选的课程名称/代码/ID 关键词列表。传空列表 [] 表示拉取所有课程。
                         例如：["CS3103"] 或 ["Networks", "Database"] 或 []（全部）。
        - import_to_tasks: 传 false 仅展示数据；传 true 同时把作业保存到 tasks 数据库（幂等）。

        返回 JSON 字符串，包含 courses（每门课含 assignments 列表及 deadline）。
        import_to_tasks=true 时还包含 imported.created / imported.updated 计数。
        """
        result = await _sync_canvas_assignments(user_id, course_filter or [], import_to_tasks)
        return json.dumps(result, ensure_ascii=False)

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
            task = await _create_new_task(
                user_id,
                title,
                priority,
                deadline,
                module,
                created_at=client_now,
                updated_at=client_now,
            )
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

    llm_kwargs: dict[str, Any] = {
        "api_key": (user_ai.get("apiKey") or settings.OPENAI_API_KEY or "ollama"),
        "model": (user_ai.get("model") or settings.OPENAI_MODEL),
        "temperature": 0,
        "timeout": 30,
        "max_retries": 2,
    }
    if getattr(settings, "OPENAI_BASE_URL", None):
        # 允许切到本地/国内兼容平台（例如 Ollama 的 /v1）
        llm_kwargs["base_url"] = settings.OPENAI_BASE_URL

    def _create_chat_llm(kwargs: dict[str, Any]):
        try:
            return ChatOpenAI(**kwargs)
        except TypeError:
            next_kwargs = {**kwargs}
            next_kwargs.pop("base_url", None)
            try:
                return ChatOpenAI(**next_kwargs)
            except TypeError:
                next_kwargs.pop("timeout", None)
                next_kwargs.pop("max_retries", None)
                return ChatOpenAI(**next_kwargs)

    llm = _create_chat_llm(llm_kwargs)

    # create_react_agent 会构建一个"可调用工具"的 Agent Graph。
    # 输入 state: {"messages": [...] }，输出 state 仍包含 messages（含工具调用与最终回复）。
    graph = create_react_agent(
        llm,
        tools,
        prompt="""You are StudyFlow AI assistant. Use tools when helpful.

## Canvas assignment rules
- ANY request about fetching / listing / showing Canvas assignments → call sync_canvas_assignments.
- Default: import_to_tasks=False (display only). Only set import_to_tasks=True when the user explicitly says to add / import / save assignments to their task list.
- Use course_filter to match the course names or codes the user mentions (e.g. ["CS3103"] or ["Networks", "Database"]). Pass None to fetch all courses.
- If a user says "帮我把 XXX 和 YYY 的作业加入 tasks", set course_filter=["XXX","YYY"] and import_to_tasks=True.

## Canvas response format
When displaying assignments, always reply in this exact format (use the user's language):
我识别到你以下 N 门课程的作业：

[Course Name]：
  作业名，deadline YYYY-MM-DD
  作业名，deadline YYYY-MM-DD

[Course Name]：
  作业名，deadline YYYY-MM-DD
  ...

If deadline is null, write "deadline 未设置".
When import_to_tasks=True succeeded, append: "已将上述作业导入 tasks（新增 X 条，更新 Y 条）。"

## General rules
- Do not claim actions happened unless a tool call returned ok=true.
- Keep responses concise and actionable.
- Respond in the same language the user is using.""",
    )

    try:
        from langchain_core.messages import HumanMessage

        # 把 history 交给模型：让它"记住"上下文（否则每次都是单轮问答）
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
