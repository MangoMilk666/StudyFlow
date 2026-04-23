from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class RegisterRequest(BaseModel):
    """注册请求体。

    与旧 Express 保持一致：
    - username/email/password 必填（路由层会做校验并给出兼容错误信息）
    """

    model_config = ConfigDict(extra="ignore")

    username: str | None = None
    email: str | None = None
    password: str | None = None


class LoginRequest(BaseModel):
    """登录请求体（email + password）。"""

    model_config = ConfigDict(extra="ignore")

    email: str | None = None
    password: str | None = None


class UpdateEmailRequest(BaseModel):
    """更新邮箱请求体。"""

    model_config = ConfigDict(extra="ignore")

    email: str | None = None


class UserOut(BaseModel):
    """返回给前端的用户对象（与 Express 返回结构对齐）。

    注意：这里使用 userId（而不是 _id），是为了与旧 API JSON 字段一致。
    """

    model_config = ConfigDict(extra="ignore")

    userId: str
    username: str
    email: str


class AuthResponse(BaseModel):
    """Auth 相关接口统一响应：token + user。"""

    model_config = ConfigDict(extra="ignore")

    token: str
    user: UserOut
