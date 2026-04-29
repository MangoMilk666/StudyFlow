"""任务相关路由（/api/tasks/*）。

核心职责：
- 任务 CRUD（list/create/get/update/delete）
- 状态流转（PATCH /:id/status）
- 子任务追加（POST /:id/subtask）

实现要点：
- 所有接口都通过 Depends(get_current_user) 做鉴权，并按 userId 过滤数据
- create/update 支持 moduleName：
  - 如果只传 moduleName（未传 module ObjectId），会自动在 modules 集合里 upsert 并绑定 module
- createdAt/updatedAt 支持由前端传入“设备时间”：
  - 若传入无时区时间，会按服务器本地时区补齐再转 UTC，减少跨时区联调困惑
"""

from datetime import datetime, timezone
import re

from fastapi import APIRouter, Body, Depends
from pymongo import ReturnDocument

from app.deps import get_current_user
from app.errors import ApiError
from app.models.module import ModuleOut
from app.models.task import (
    SubtaskCreateRequest,
    TaskCreateRequest,
    TaskOut,
    TaskStatusUpdateRequest,
    TaskUpdateRequest,
)
from app.services.db import MongoNotReadyError, get_db_checked
from app.utils.datetime import parse_datetime
from app.utils.mongo import oid_str, serialize_datetime, to_object_id


router = APIRouter()

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

async def _get_or_create_module_by_name(db, user_oid, name: str, now: datetime) -> dict:
    cleaned = (name or "").strip()
    if not cleaned:
        raise ApiError(400, "moduleName required")

    return await db.modules.find_one_and_update(
        {"userId": user_oid, "name": {"$regex": f"^{re.escape(cleaned)}$", "$options": "i"}},
        {
            "$setOnInsert": {
                "userId": user_oid,
                "name": cleaned,
                "colorCode": "#3f51b5",
                "description": "",
                "createdAt": now,
                "updatedAt": now,
            }
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )


async def _load_modules_map(db, user_oid, module_oids: list):
    if not module_oids:
        return {}
    docs = await db.modules.find({"_id": {"$in": module_oids}, "userId": user_oid}).to_list(length=None)
    out = {}
    for d in docs:
        out[oid_str(d.get("_id"))] = ModuleOut(
            _id=oid_str(d.get("_id")),
            userId=oid_str(d.get("userId")),
            name=str(d.get("name") or ""),
            colorCode=d.get("colorCode"),
            description=d.get("description"),
            createdAt=serialize_datetime(d.get("createdAt")),
            updatedAt=serialize_datetime(d.get("updatedAt")),
        ).model_dump(by_alias=True)
    return out


def _serialize_task(doc: dict, module_doc: dict | None = None) -> dict:
    module_value = module_doc
    if module_value is None and doc.get("module") is not None:
        module_value = oid_str(doc.get("module"))

    source_value = doc.get("source")
    # 修复旧数据：如果 source 是字符串，就转换成 {"type": source}
    if isinstance(source_value, str):
        source_value = {"type": source_value}

    return TaskOut(
        _id=oid_str(doc.get("_id")),
        userId=oid_str(doc.get("userId")),
        title=str(doc.get("title") or ""),
        description=doc.get("description"),
        status=doc.get("status"),
        priority=doc.get("priority"),
        deadline=serialize_datetime(doc.get("deadline")),
        module=module_value,
        moduleName=doc.get("moduleName"),
        source=source_value,
        timeSpent=doc.get("timeSpent"),
        subtasks=doc.get("subtasks"),
        createdAt=serialize_datetime(doc.get("createdAt")),
        updatedAt=serialize_datetime(doc.get("updatedAt")),
        unlockAt=serialize_datetime(doc.get("unlockAt")),
    ).model_dump(by_alias=True)


@router.get("")
async def list_tasks(current_user: dict = Depends(get_current_user)):
    """获取当前用户任务列表（按 userId 过滤）。

    行为与 Express 版保持一致：返回数组，并尽量填充 module 信息。
    """

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    user_oid = to_object_id(current_user["userId"])
    docs = await db.tasks.find({"userId": user_oid}).to_list(length=None)

    module_oids = [d.get("module") for d in docs if d.get("module") is not None]
    modules_map = await _load_modules_map(db, user_oid, module_oids)

    out = []
    for d in docs:
        mod = None
        if d.get("module") is not None:
            mod = modules_map.get(oid_str(d.get("module")))
        out.append(_serialize_task(d, mod))
    return out


@router.post("", status_code=201)
async def create_task(
    payload: TaskCreateRequest = Body(default_factory=TaskCreateRequest),
    current_user: dict = Depends(get_current_user),
):
    """创建任务。
x
    兼容 Express：title 必填，否则 400 {"error":"title required"}
    """

    title = (payload.title or "").strip()
    if not title:
        raise ApiError(400, "title required")

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    now = datetime.now(timezone.utc)
    created_at = _coerce_client_datetime(payload.createdAt, fallback=now)
    updated_at = _coerce_client_datetime(payload.updatedAt, fallback=created_at)
    user_oid = to_object_id(current_user["userId"])
    module_oid = to_object_id(payload.module) if payload.module else None
    module_name = (payload.moduleName or "").strip()

    if module_oid is None and module_name:
        module_doc = await _get_or_create_module_by_name(db, user_oid, module_name, created_at)
        module_oid = module_doc.get("_id")
        module_name = str(module_doc.get("name") or module_name)
    elif module_oid is not None and not module_name:
        module_doc = await db.modules.find_one({"_id": module_oid, "userId": user_oid})
        if module_doc:
            module_name = str(module_doc.get("name") or "")

    doc: dict = {
        "userId": user_oid,
        "title": title,
        "description": payload.description or "",
        "priority": payload.priority or "Medium",
        "deadline": parse_datetime(payload.deadline),
        "module": module_oid,
        "moduleName": module_name,
        "status": payload.status or "To Do",
        "source": payload.source,
        "timeSpent": 0,
        "subtasks": [],
        "createdAt": created_at,
        "updatedAt": updated_at,
        "unlockAt": parse_datetime(payload.unlockAt),
    }
    doc = {k: v for k, v in doc.items() if v is not None or k in {"module", "deadline", "unlockAt"}}
    result = await db.tasks.insert_one(doc)
    created = await db.tasks.find_one({"_id": result.inserted_id})
    created = created or {**doc, "_id": result.inserted_id}

    mod_doc = None
    if created.get("module") is not None:
        module = await db.modules.find_one({"_id": created.get("module")})
        if module:
            mod_doc = ModuleOut(
                _id=oid_str(module.get("_id")),
                userId=oid_str(module.get("userId")),
                name=str(module.get("name") or ""),
                colorCode=module.get("colorCode"),
                description=module.get("description"),
                createdAt=serialize_datetime(module.get("createdAt")),
                updatedAt=serialize_datetime(module.get("updatedAt")),
            ).model_dump(by_alias=True)
    return _serialize_task(created, mod_doc)


@router.get("/{id}")
async def get_task(id: str, current_user: dict = Depends(get_current_user)):
    """按 id 获取任务。

    - 不存在：404 {"error":"Task not found"}
    - 非本人：403 {"error":"Forbidden"}
    """

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    task = await db.tasks.find_one({"_id": to_object_id(id)})
    if not task:
        raise ApiError(404, "Task not found")
    if oid_str(task.get("userId")) != current_user["userId"]:
        raise ApiError(403, "Forbidden")

    mod_doc = None
    if task.get("module") is not None:
        module = await db.modules.find_one({"_id": task.get("module")})
        if module:
            mod_doc = ModuleOut(
                _id=oid_str(module.get("_id")),
                userId=oid_str(module.get("userId")),
                name=str(module.get("name") or ""),
                colorCode=module.get("colorCode"),
                description=module.get("description"),
                createdAt=serialize_datetime(module.get("createdAt")),
                updatedAt=serialize_datetime(module.get("updatedAt")),
            ).model_dump(by_alias=True)

    return _serialize_task(task, mod_doc)


@router.put("/{id}")
async def update_task(
    id: str,
    payload: TaskUpdateRequest = Body(default_factory=TaskUpdateRequest),
    current_user: dict = Depends(get_current_user),
):
    """更新任务（PUT）。

    Express 版是把 req.body 直接当 updates 使用。
    这里也采取“尽量透传更新字段”的策略（extra=allow），并补齐 updatedAt。
    """

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    existing = await db.tasks.find_one({"_id": to_object_id(id)})
    if not existing:
        raise ApiError(404, "Task not found")
    if oid_str(existing.get("userId")) != current_user["userId"]:
        raise ApiError(403, "Forbidden")

    updates: dict = payload.model_dump(exclude_none=True)
    now = datetime.now(timezone.utc)
    if "deadline" in updates:
        updates["deadline"] = parse_datetime(updates.get("deadline"))
    if "module" in updates:
        updates["module"] = to_object_id(updates.get("module")) if updates.get("module") else None
    if "unlockAt" in updates:
        updates["unlockAt"] = parse_datetime(updates.get("unlockAt"))
    if "moduleName" in updates and "module" not in updates:
        user_oid = to_object_id(current_user["userId"])
        name = str(updates.get("moduleName") or "").strip()
        if name:
            module_doc = await _get_or_create_module_by_name(db, user_oid, name, now)
            updates["module"] = module_doc.get("_id")
            updates["moduleName"] = str(module_doc.get("name") or name)
        else:
            updates["module"] = None
            updates["moduleName"] = ""

    updates["updatedAt"] = now
    await db.tasks.update_one({"_id": to_object_id(id)}, {"$set": updates})
    task = await db.tasks.find_one({"_id": to_object_id(id)})
    task = task or {**existing, **updates}

    mod_doc = None
    if task.get("module") is not None:
        module = await db.modules.find_one({"_id": task.get("module")})
        if module:
            mod_doc = ModuleOut(
                _id=oid_str(module.get("_id")),
                userId=oid_str(module.get("userId")),
                name=str(module.get("name") or ""),
                colorCode=module.get("colorCode"),
                description=module.get("description"),
                createdAt=serialize_datetime(module.get("createdAt")),
                updatedAt=serialize_datetime(module.get("updatedAt")),
            ).model_dump(by_alias=True)
    return _serialize_task(task, mod_doc)


@router.delete("/{id}")
async def delete_task(id: str, current_user: dict = Depends(get_current_user)):
    """删除任务。"""

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    existing = await db.tasks.find_one({"_id": to_object_id(id)})
    if not existing:
        raise ApiError(404, "Task not found")
    if oid_str(existing.get("userId")) != current_user["userId"]:
        raise ApiError(403, "Forbidden")

    await db.tasks.delete_one({"_id": to_object_id(id)})
    return {"message": "Task deleted successfully"}


@router.patch("/{id}/status")
async def update_task_status(
    id: str,
    payload: TaskStatusUpdateRequest = Body(default_factory=TaskStatusUpdateRequest),
    current_user: dict = Depends(get_current_user),
):
    """仅更新任务状态（PATCH）。"""

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    existing = await db.tasks.find_one({"_id": to_object_id(id)})
    if not existing:
        raise ApiError(404, "Task not found")
    if oid_str(existing.get("userId")) != current_user["userId"]:
        raise ApiError(403, "Forbidden")

    await db.tasks.update_one(
        {"_id": to_object_id(id)},
        {"$set": {"status": payload.status, "updatedAt": datetime.now(timezone.utc)}},
    )
    task = await db.tasks.find_one({"_id": to_object_id(id)})
    if not task:
        raise ApiError(404, "Task not found")

    mod_doc = None
    if task.get("module") is not None:
        module = await db.modules.find_one({"_id": task.get("module")})
        if module:
            mod_doc = ModuleOut(
                _id=oid_str(module.get("_id")),
                userId=oid_str(module.get("userId")),
                name=str(module.get("name") or ""),
                colorCode=module.get("colorCode"),
                description=module.get("description"),
                createdAt=serialize_datetime(module.get("createdAt")),
                updatedAt=serialize_datetime(module.get("updatedAt")),
            ).model_dump(by_alias=True)
    return _serialize_task(task, mod_doc)


@router.post("/{id}/subtask")
async def add_subtask(
    id: str,
    payload: SubtaskCreateRequest = Body(default_factory=SubtaskCreateRequest),
    current_user: dict = Depends(get_current_user),
):
    """为任务追加一个 subtask。"""

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    task = await db.tasks.find_one({"_id": to_object_id(id)})
    if not task:
        raise ApiError(404, "Task not found")
    if oid_str(task.get("userId")) != current_user["userId"]:
        raise ApiError(403, "Forbidden")

    await db.tasks.update_one(
        {"_id": to_object_id(id)},
        {
            "$push": {"subtasks": {"text": payload.text, "completed": False}},
            "$set": {"updatedAt": datetime.now(timezone.utc)},
        },
    )
    updated = await db.tasks.find_one({"_id": to_object_id(id)})
    if not updated:
        raise ApiError(404, "Task not found")

    return _serialize_task(updated, None)
