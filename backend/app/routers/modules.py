from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends

from app.deps import get_current_user
from app.errors import ApiError
from app.models.module import ModuleCreateRequest, ModuleOut, ModuleUpdateRequest
from app.services.db import MongoNotReadyError, get_db_checked
from app.utils.mongo import oid_str, serialize_datetime, to_object_id


router = APIRouter()


def _serialize_module(doc: dict) -> dict:
    return ModuleOut(
        _id=oid_str(doc.get("_id")),
        userId=oid_str(doc.get("userId")),
        name=str(doc.get("name") or ""),
        colorCode=doc.get("colorCode"),
        description=doc.get("description"),
        createdAt=serialize_datetime(doc.get("createdAt")),
        updatedAt=serialize_datetime(doc.get("updatedAt")),
    ).model_dump(by_alias=True)


@router.get("")
async def list_modules(current_user: dict = Depends(get_current_user)):
    """获取当前用户的 module 列表（按 userId 过滤）。"""

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    user_id = to_object_id(current_user["userId"])
    docs = await db.modules.find({"userId": user_id}).to_list(length=None)
    return [_serialize_module(d) for d in docs]


@router.post("", status_code=201)
async def create_module(
    payload: ModuleCreateRequest = Body(default_factory=ModuleCreateRequest),
    current_user: dict = Depends(get_current_user),
):
    """创建 module（课程/模块）。

    - name 必填，否则 400 {"error":"name required"}
    """

    name = (payload.name or "").strip()
    if not name:
        raise ApiError(400, "name required")

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    now = datetime.now(timezone.utc)
    doc = {
        "userId": to_object_id(current_user["userId"]),
        "name": name,
        "colorCode": payload.colorCode or "#3f51b5",
        "description": payload.description or "",
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.modules.insert_one(doc)
    created = await db.modules.find_one({"_id": result.inserted_id})
    return _serialize_module(created or {**doc, "_id": result.inserted_id})


@router.put("/{id}")
async def update_module(
    id: str,
    payload: ModuleUpdateRequest = Body(default_factory=ModuleUpdateRequest),
    current_user: dict = Depends(get_current_user),
):
    """更新 module（PUT）。

    与 Express 版保持一致：允许透传更新字段，并补齐 updatedAt。
    """

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    existing = await db.modules.find_one({"_id": to_object_id(id)})
    if not existing:
        raise ApiError(404, "Module not found")
    if oid_str(existing.get("userId")) != current_user["userId"]:
        raise ApiError(403, "Forbidden")

    updates: dict = payload.model_dump(exclude_none=True)

    updates["updatedAt"] = datetime.now(timezone.utc)
    await db.modules.update_one({"_id": to_object_id(id)}, {"$set": updates})
    updated = await db.modules.find_one({"_id": to_object_id(id)})
    return _serialize_module(updated or {**existing, **updates})


@router.delete("/{id}")
async def delete_module(id: str, current_user: dict = Depends(get_current_user)):
    """删除 module。"""

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    existing = await db.modules.find_one({"_id": to_object_id(id)})
    if not existing:
        raise ApiError(404, "Module not found")
    if oid_str(existing.get("userId")) != current_user["userId"]:
        raise ApiError(403, "Forbidden")

    await db.modules.delete_one({"_id": to_object_id(id)})
    return {"message": "Module deleted successfully"}
