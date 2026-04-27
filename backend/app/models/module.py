from __future__ import annotations

"""模块（课程/分类）相关 Pydantic 模型。"""

from pydantic import BaseModel, ConfigDict, Field


class ModuleCreateRequest(BaseModel):
    """创建 Module 的请求体。

    与 Express 版一致：name 必填（由路由层校验）。
    """

    model_config = ConfigDict(extra="ignore")

    name: str | None = None
    colorCode: str | None = None
    description: str | None = None


class ModuleUpdateRequest(BaseModel):
    """更新 Module 的请求体。

    - extra=allow：兼容旧 Express 的“透传 updates”行为
    - 字段均可选
    """

    model_config = ConfigDict(extra="allow")

    name: str | None = None
    colorCode: str | None = None
    description: str | None = None


class ModuleOut(BaseModel):
    """返回给前端的 Module 对象。

    关键点：
    - MongoDB 的主键是 _id，这里用 alias 把它映射为 id 字段（保持返回仍带 _id）。
    - populate_by_name=True：允许既用 _id 也用 id 填充。
    """

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: str = Field(alias="_id")
    userId: str
    name: str
    colorCode: str | None = None
    description: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
