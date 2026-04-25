from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.module import ModuleOut


class TaskSource(BaseModel):
    """任务来源信息。

    当前主要用于 Canvas 同步：
    - type: "canvas"
    - courseId / assignmentId：用于幂等去重
    """

    model_config = ConfigDict(extra="ignore")

    type: str | None = None
    courseId: str | None = None
    assignmentId: str | None = None


class SubtaskOut(BaseModel):
    """子任务结构（轻量） VO"""

    model_config = ConfigDict(extra="ignore")

    text: str | None = None
    completed: bool | None = None


class TaskOut(BaseModel):
    """返回给前端的 Task VO对象。

    兼容点：
    - 仍输出 MongoDB 风格字段（如 _id、userId）
    - module 字段在 list/get 时会尽量填充为 Module 对象（类似 Mongoose populate）
    """

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: str = Field(alias="_id")
    userId: str
    title: str
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    deadline: str | None = None
    module: ModuleOut | dict | None = None
    moduleName: str | None = None
    source: TaskSource | dict | None = None
    timeSpent: int | float | None = None
    subtasks: list[SubtaskOut] | list[dict] | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
    unlockAt: str | None = None


class TaskCreateRequest(BaseModel):
    """创建任务请求体 DTO。

    注意：deadline/unlockAt 在请求中通常是 ISO 字符串，路由层会做解析。
    """

    model_config = ConfigDict(extra="ignore")

    title: str | None = None
    description: str | None = None
    priority: str | None = None
    deadline: str | None = None
    module: str | None = None
    moduleName: str | None = None
    status: str | None = None
    source: dict[str, Any] | None = None
    unlockAt: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None


class TaskUpdateRequest(BaseModel):
    """更新任务请求体 DTO。

    - extra=allow：兼容 Express 的 PUT 直接透传 req.body
    - 字段均可选
    """
    # 允许后端接收比定义更多的字段而不报错
    model_config = ConfigDict(extra="allow")

    title: str | None = None
    description: str | None = None
    priority: str | None = None
    deadline: str | None = None
    module: str | None = None
    moduleName: str | None = None
    status: str | None = None
    source: dict[str, Any] | None = None
    timeSpent: int | float | None = None
    subtasks: list[dict[str, Any]] | None = None
    unlockAt: str | None = None


class TaskStatusUpdateRequest(BaseModel):
    """仅更新状态的请求体 DTO"""

    model_config = ConfigDict(extra="ignore")

    status: str | None = None


class SubtaskCreateRequest(BaseModel):
    """追加 subtask 的请求体 DTO"""

    model_config = ConfigDict(extra="ignore")

    text: str | None = None
