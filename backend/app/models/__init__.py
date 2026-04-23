"""Pydantic 模型集合。

这些模型用于：
- 解析请求体（Request）
- 规范化输出结构（Response）

注意：为了与原 Express API 兼容，这里很多字段名会沿用旧版（如 userId、_id）。
"""

from app.models.auth import AuthResponse, LoginRequest, RegisterRequest, UpdateEmailRequest, UserOut
from app.models.module import ModuleCreateRequest, ModuleOut, ModuleUpdateRequest
from app.models.task import (
    SubtaskCreateRequest,
    TaskCreateRequest,
    TaskOut,
    TaskStatusUpdateRequest,
    TaskUpdateRequest,
)
from app.models.timer import TimerStartRequest, TimerStopRequest

__all__ = [
    "AuthResponse",
    "LoginRequest",
    "RegisterRequest",
    "UpdateEmailRequest",
    "UserOut",
    "ModuleCreateRequest",
    "ModuleOut",
    "ModuleUpdateRequest",
    "SubtaskCreateRequest",
    "TaskCreateRequest",
    "TaskOut",
    "TaskStatusUpdateRequest",
    "TaskUpdateRequest",
    "TimerStartRequest",
    "TimerStopRequest",
]
