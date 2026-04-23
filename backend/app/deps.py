from __future__ import annotations

from fastapi import Header

from app.errors import ApiError
from app.services.security import UnauthorizedError, decode_token


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """鉴权依赖：解析并校验 Bearer JWT。

    兼容 Express 版行为：
    - 缺失或无效 token：返回 401 {"error": "Unauthorized"}
    - 成功：返回 payload 中的 userId/email
    """

    if not authorization or not authorization.startswith("Bearer "):
        raise ApiError(401, "Unauthorized")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise ApiError(401, "Unauthorized")

    try:
        payload = decode_token(token)
    except UnauthorizedError:
        raise ApiError(401, "Unauthorized")

    user_id = payload.get("userId")
    email = payload.get("email")
    if not user_id or not email:
        raise ApiError(401, "Unauthorized")

    return {"userId": str(user_id), "email": str(email)}
