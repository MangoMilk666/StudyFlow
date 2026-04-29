from __future__ import annotations

"""FastAPI 依赖（Dependencies）。

在 FastAPI 中，Depends() 是“把通用逻辑提取成可复用组件”的方式。
本文件目前最核心的依赖是 get_current_user：
- 从请求头 Authorization: Bearer <token> 解析 JWT
- 校验签名与过期时间
- 失败统一抛出 ApiError(401)
"""

from datetime import datetime, timezone
from fastapi import Header

from app.errors import ApiError
from app.services.db import MongoNotReadyError, get_db_checked
from app.services.security import UnauthorizedError, decode_token
from app.utils.mongo import oid_str, to_object_id


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """鉴权依赖：解析并校验 Bearer JWT。

    兼容 Express 版行为：
    - 缺失或无效 token：返回 401 {"error": "Unauthorized"}
    - 成功：返回 payload 中的 userId/email
    """

    # 只接受 Bearer token：保持与前端 axios interceptor 的约定一致
    if not authorization or not authorization.startswith("Bearer "):
        raise ApiError(401, "Unauthorized")

    # split(" ", 1) 可避免 header 里出现多余空格时解析错误
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise ApiError(401, "Unauthorized")

    try:
        # decode_token 内部会校验签名与 exp，任何失败都统一抛 UnauthorizedError
        payload = decode_token(token)
    except UnauthorizedError:
        raise ApiError(401, "Unauthorized")

    user_id = payload.get("userId")
    email = payload.get("email")
    # payload 缺字段也视为未授权：避免“伪造 token 但缺关键字段”绕过后续逻辑
    if not user_id or not email:
        raise ApiError(401, "Unauthorized")

    try:
        to_object_id(str(user_id))
    except Exception:
        raise ApiError(401, "Unauthorized")

    sid = payload.get("sid")
    if sid:
        try:
            db = await get_db_checked()
        except MongoNotReadyError:
            raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
        try:
            sid_oid = to_object_id(str(sid))
        except Exception:
            raise ApiError(401, "Unauthorized")
        session = await db.sessions.find_one(
            {"_id": sid_oid, "userId": to_object_id(str(user_id)), "revokedAt": None}
        )
        if not session:
            raise ApiError(401, "Unauthorized")
        await db.sessions.update_one({"_id": sid_oid}, {"$set": {"lastSeenAt": datetime.now(timezone.utc)}})
        return {"userId": str(user_id), "email": str(email), "sessionId": oid_str(session.get("_id"))}

    return {"userId": str(user_id), "email": str(email), "sessionId": None}
