"""认证相关路由（/api/auth/*）。

提供：
- POST /register：注册，写入 users 集合并签发 JWT
- POST /login：登录，校验密码并签发 JWT
- PATCH /email：更新邮箱（需要 Bearer JWT）

说明：
- 本项目为了兼容旧 Express 版，返回结构统一为 {token, user:{...}} 或 {"error": "..."}。
"""

from datetime import datetime, timezone

from app.deps import get_current_user
from app.errors import ApiError
from app.models.auth import AuthResponse, LoginRequest, RegisterRequest, UpdateEmailRequest, UserOut
from app.services.db import MongoNotReadyError, get_db_checked
from app.services.security import create_access_token, hash_password, verify_password
from app.utils.mongo import oid_str, to_object_id
from fastapi import APIRouter, Body, Depends, Request


router = APIRouter()

async def _create_session(
    db,
    *,
    user_oid,
    device_name: str | None,
    persistent_id: str | None,
    request: Request,
    now: datetime,
) -> str:
    user_agent = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    cleaned_device = (device_name or "").strip() or None
    cleaned_pid = (persistent_id or "").strip() or None

    # Priority 1: stable UUID — survives browser updates and UA changes
    if cleaned_pid:
        existing = await db.sessions.find_one(
            {"userId": user_oid, "revokedAt": None, "persistentId": cleaned_pid}
        )
        # 同一台设备上的浏览器，uuid存在 -> 更新lastSeenAt
        if existing:
            await db.sessions.update_one(
                {"_id": existing.get("_id")},
                {"$set": {"lastSeenAt": now, "ip": ip, "userAgent": user_agent, "deviceName": cleaned_device}},
            )
            return oid_str(existing.get("_id"))

    # Priority 2 (legacy — no UUID): real platform name match, ignore UA version drift
    if cleaned_device and cleaned_device != "browser":
        existing = await db.sessions.find_one(
            {"userId": user_oid, "revokedAt": None, "deviceName": cleaned_device, "persistentId": None}
        )
        # 没有uuid，但是老的平台名称匹配的到 -> 更新lastSeenAt, ip, user_agent字段
        if existing:
            await db.sessions.update_one(
                {"_id": existing.get("_id")},
                {"$set": {"lastSeenAt": now, "ip": ip, "userAgent": user_agent}},
            )
            return oid_str(existing.get("_id"))

    # Priority 3 (legacy — no UUID, generic deviceName): exact UA match
    if user_agent:
        existing = await db.sessions.find_one(
            {"userId": user_oid, "revokedAt": None, "deviceName": cleaned_device,
             "userAgent": user_agent, "persistentId": None}
        )
        if existing:
            await db.sessions.update_one(
                {"_id": existing.get("_id")},
                {"$set": {"lastSeenAt": now, "ip": ip}},
            )
            return oid_str(existing.get("_id"))

    doc = {
        "userId": user_oid,
        "persistentId": cleaned_pid,
        "deviceName": cleaned_device,
        "userAgent": user_agent,
        "ip": ip,
        "createdAt": now,
        "lastSeenAt": now,
        "revokedAt": None,
    }
    result = await db.sessions.insert_one(doc)
    return oid_str(result.inserted_id)


@router.post("/register", status_code=201)
async def register(request: Request, payload: RegisterRequest = Body(default_factory=RegisterRequest)):
    """注册。

    与旧 Express 保持兼容：
    - 缺字段：400 {"error": "username/email/password required"}
    - 成功：201 { token, user: { userId, username, email } }
    """

    username = (payload.username or "").strip()
    email = (payload.email or "").strip().lower()
    password = payload.password or ""
    if not username or not email or not password:
        raise ApiError(400, "username/email/password required")

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    existing = await db.users.find_one({"$or": [{"email": email}, {"username": username}]})
    if existing:
        raise ApiError(400, "User already exists")

    now = datetime.now(timezone.utc)
    result = await db.users.insert_one(
        {
            "username": username,
            "email": email,
            "password": hash_password(password),
            "avatarUrl": None,
            "dataSharingAccepted": False,
            "dataSharingAcceptedAt": None,
            "dataSharingVersion": None,
            "createdAt": now,
            "updatedAt": now,
        }
    )

    user_id = oid_str(result.inserted_id)
    session_id = await _create_session(
        db,
        user_oid=to_object_id(user_id),
        device_name=payload.deviceName,
        persistent_id=payload.persistentId,
        request=request,
        now=now,
    )
    token = create_access_token(user_id=user_id, email=email, session_id=session_id)
    return AuthResponse(token=token, user=UserOut(userId=user_id, username=username, email=email))


@router.post("/login")
async def login(request: Request, payload: LoginRequest = Body(default_factory=LoginRequest)):
    """登录。
    FastAPI 会自动去 HTTP Body 里寻找 JSON 数据并反序列化成这个对象
    与旧 Express 保持兼容：
    - 缺字段：400 {"error": "email/password required"}
    - 失败：401 {"error": "Invalid credentials"}
    - 成功：200 { token, user: { userId, username, email } }
    """

    email = (payload.email or "").strip().lower()
    password = payload.password or ""
    if not email or not password:
        raise ApiError(400, "email/password required")

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    user = await db.users.find_one({"email": email})
    if not user:
        raise ApiError(401, "Invalid credentials")

    if not verify_password(password, str(user.get("password") or "")):
        raise ApiError(401, "Invalid credentials")

    now = datetime.now(timezone.utc)
    user_id = oid_str(user.get("_id"))
    session_id = await _create_session(
        db,
        user_oid=to_object_id(user_id),
        device_name=payload.deviceName,
        persistent_id=payload.persistentId,
        request=request,
        now=now,
    )
    token = create_access_token(user_id=user_id, email=email, session_id=session_id)
    return AuthResponse(
        token=token,
        user=UserOut(userId=user_id, username=str(user.get("username") or ""), email=email),
    )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    登出：吊销当前 JWT 对应的 session。
    """
    session_id = current_user.get("sessionId")
    if not session_id:
        return {"message": "Logged out"}
    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    now = datetime.now(timezone.utc)
    await db.sessions.update_one(
        {"_id": to_object_id(session_id), "revokedAt": None},
        {"$set": {"revokedAt": now}},
    )
    return {"message": "Logged out"}


@router.patch("/email")
async def update_email(
    payload: UpdateEmailRequest = Body(default_factory=UpdateEmailRequest),
    current_user: dict = Depends(get_current_user),
):
    """更新邮箱（需要 Bearer JWT）。

    与旧 Express 保持兼容：
    - 缺 email：400 {"error": "email required"}
    - email 被占用：409 {"error": "Email already in use"}
    - 成功：200 { user: { userId, username, email } }
    """

    new_email = (payload.email or "").strip().lower()
    if not new_email:
        raise ApiError(400, "email required")

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    user_id = current_user["userId"]
    exists = await db.users.find_one({"email": new_email, "_id": {"$ne": to_object_id(user_id)}})
    if exists:
        raise ApiError(409, "Email already in use")

    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"_id": to_object_id(user_id)},
        {"$set": {"email": new_email, "updatedAt": now}},
    )
    updated = await db.users.find_one({"_id": to_object_id(user_id)})
    if not updated:
        raise ApiError(404, "User not found")

    return {
        "user": {
            "userId": oid_str(updated.get("_id")),
            "username": str(updated.get("username") or ""),
            "email": str(updated.get("email") or ""),
        }
    }
