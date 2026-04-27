from __future__ import annotations

"""FastAPI 依赖（Dependencies）。

在 FastAPI 中，Depends() 是“把通用逻辑提取成可复用组件”的方式。
本文件目前最核心的依赖是 get_current_user：
- 从请求头 Authorization: Bearer <token> 解析 JWT
- 校验签名与过期时间
- 失败统一抛出 ApiError(401)
"""

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
