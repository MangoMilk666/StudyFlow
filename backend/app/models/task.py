from __future__ import annotations

"""任务相关 Pydantic 模型。

说明：
- TaskOut 用于返回给前端（字段名尽量兼容旧 Express）
- TaskCreateRequest/TaskUpdateRequest 用于解析请求体
- 这里包含 subtasks/source 等扩展字段（用于标注 Canvas 同步或AI生成）
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.module import ModuleOut


class TaskSource(BaseModel):
    """任务来源信息。

    当前主要用于 Canvas 同步：
    - type: "canvas" / "ai"
    - courseId / assignmentId：用于幂等去重
    """

    model_config = ConfigDict(extra="ignore")
    # 来源：ai生成/canvas导入/手动创建(不写）
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
    # 允许按别名赋值
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: str = Field(alias="_id")
    userId: str
    title: str
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    deadline: str | None = None
    module: ModuleOut | dict | str | None = None
    moduleName: str | None = None
    source: TaskSource | dict | None = None
    # 累积花费分钟数
    timeSpent: int | float | None = None
    # TO DO: 子任务，没用到过?
    subtasks: list[SubtaskOut] | list[dict] | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
    # 开启时间，用于Canvas导入的作业开放时间
    unlockAt: str | None = None
    archivedAt: str | None = None


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
    archivedAt: str | None = None


class TaskStatusUpdateRequest(BaseModel):
    """仅更新状态的请求体 DTO，用于Dashboard的流转"""

    model_config = ConfigDict(extra="ignore")

    status: str | None = None


class SubtaskCreateRequest(BaseModel):
    """追加 subtask 的请求体 DTO"""

    model_config = ConfigDict(extra="ignore")

    text: str | None = None
