from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends

from app.deps import get_current_user
from app.errors import ApiError
from app.models.user import AIConfigOut, AIConfigUpdateRequest, ConsentUpdateRequest, DeviceOut, ProfileOut
from app.services.crypto import encrypt_text
from app.services.db import MongoNotReadyError, get_db_checked
from app.utils.mongo import oid_str, serialize_datetime, to_object_id


router = APIRouter()


def _serialize_profile(doc: dict) -> dict:
    return ProfileOut(
        userId=oid_str(doc.get("_id")),
        username=str(doc.get("username") or ""),
        email=str(doc.get("email") or ""),
        avatarUrl=doc.get("avatarUrl"),
        dataSharingAccepted=doc.get("dataSharingAccepted"),
        dataSharingAcceptedAt=serialize_datetime(doc.get("dataSharingAcceptedAt")),
        dataSharingVersion=doc.get("dataSharingVersion"),
    ).model_dump()


def _serialize_ai_config(doc: dict | None) -> dict:
    if not doc:
        return AIConfigOut(usePersonalKey=False, hasApiKey=False, model=None).model_dump()
    enc = doc.get("apiKeyEnc")
    return AIConfigOut(
        usePersonalKey=bool(doc.get("usePersonalKey")),
        hasApiKey=bool(enc),
        model=doc.get("model"),
    ).model_dump()


def _serialize_device(doc: dict, current_session_id: str | None) -> dict:
    sid = oid_str(doc.get("_id"))
    return DeviceOut(
        id=sid,
        deviceName=doc.get("deviceName"),
        userAgent=doc.get("userAgent"),
        ip=doc.get("ip"),
        createdAt=serialize_datetime(doc.get("createdAt")),
        lastSeenAt=serialize_datetime(doc.get("lastSeenAt")),
        revokedAt=serialize_datetime(doc.get("revokedAt")),
        current=bool(current_session_id and sid == current_session_id),
    ).model_dump()


@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """
    查看用户信息
    """
    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    doc = await db.users.find_one({"_id": to_object_id(current_user["userId"])})
    if not doc:
        raise ApiError(404, "User not found")
    return _serialize_profile(doc)


@router.get("/ai-config")
async def get_ai_config(current_user: dict = Depends(get_current_user)):
    '''
    查看用户AI配置信息
    '''
    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    doc = await db.user_ai_configs.find_one({"userId": to_object_id(current_user["userId"])})
    return _serialize_ai_config(doc)


@router.put("/ai-config")
async def upsert_ai_config(
    payload: AIConfigUpdateRequest = Body(default_factory=AIConfigUpdateRequest),
    current_user: dict = Depends(get_current_user),
):
    '''
    用户更新ai配置信息
    '''
    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    user_oid = to_object_id(current_user["userId"])
    existing = await db.user_ai_configs.find_one({"userId": user_oid})

    updates: dict = {}
    if payload.usePersonalKey is not None:
        updates["usePersonalKey"] = bool(payload.usePersonalKey)
    if payload.model is not None:
        updates["model"] = (payload.model or "").strip() or None
    if payload.apiKey is not None:
        cleaned = (payload.apiKey or "").strip()
        if not cleaned:
            updates["apiKeyEnc"] = None
        else:
            updates["apiKeyEnc"] = encrypt_text(cleaned)
            updates.setdefault("usePersonalKey", True)

    now = datetime.now(timezone.utc)
    if existing:
        updates["updatedAt"] = now
        await db.user_ai_configs.update_one({"_id": existing.get("_id")}, {"$set": updates})
    else:
        doc = {
            "userId": user_oid,
            "usePersonalKey": bool(updates.get("usePersonalKey")) if "usePersonalKey" in updates else False,
            "apiKeyEnc": updates.get("apiKeyEnc"),
            "model": updates.get("model"),
            "createdAt": now,
            "updatedAt": now,
        }
        await db.user_ai_configs.insert_one(doc)

    saved = await db.user_ai_configs.find_one({"userId": user_oid})
    return _serialize_ai_config(saved)


@router.delete("/ai-config")
async def delete_ai_config(current_user: dict = Depends(get_current_user)):
    '''
    用户删除整个ai配置信息
    '''
    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    await db.user_ai_configs.delete_one({"userId": to_object_id(current_user["userId"])})
    return {"message": "Deleted"}


@router.put("/consent")
async def update_consent(
    payload: ConsentUpdateRequest = Body(default_factory=ConsentUpdateRequest),
    current_user: dict = Depends(get_current_user),
):
    '''
    用户更新应用使用协议
    '''
    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    now = datetime.now(timezone.utc)
    if payload.accepted:
        updates = {"dataSharingAccepted": True, "dataSharingAcceptedAt": now, "dataSharingVersion": "v1", "updatedAt": now}
    else:
        updates = {"dataSharingAccepted": False, "dataSharingAcceptedAt": None, "dataSharingVersion": None, "updatedAt": now}
    await db.users.update_one({"_id": to_object_id(current_user["userId"])}, {"$set": updates})
    doc = await db.users.find_one({"_id": to_object_id(current_user["userId"])})
    if not doc:
        raise ApiError(404, "User not found")
    return _serialize_profile(doc)


@router.get("/devices")
async def list_devices(current_user: dict = Depends(get_current_user)):
    '''
    查看登录过的设备列表
    '''
    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    user_oid = to_object_id(current_user["userId"])
    current_sid = current_user.get("sessionId")
    docs = await db.sessions.find({"userId": user_oid}).sort("lastSeenAt", -1).to_list(length=None)
    return [_serialize_device(d, current_sid) for d in docs]


@router.delete("/devices/{id}")
async def revoke_device(id: str, current_user: dict = Depends(get_current_user)):
    '''
    删除之前的登录设备信息
    '''
    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    user_oid = to_object_id(current_user["userId"])
    now = datetime.now(timezone.utc)
    try:
        sid_oid = to_object_id(id)
    except Exception:
        raise ApiError(400, "invalid device id")
    result = await db.sessions.update_one({"_id": sid_oid, "userId": user_oid}, {"$set": {"revokedAt": now}})
    if result.matched_count == 0:
        raise ApiError(404, "Device not found")
    return {"message": "Revoked"}

