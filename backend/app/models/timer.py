from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class TimerStartRequest(BaseModel):
    """开始计时请求体（只需要 taskId）。

    与旧 Express 一致：start 接口不落库。
    """

    model_config = ConfigDict(extra="ignore")

    taskId: str | None = None


class TimerStopRequest(BaseModel):
    """停止计时请求体。

    - taskId：任务 id
    - duration：本次计时秒数（int）
    - status：可选，若不传由后端根据 duration 推断 completed/interrupted
    """

    model_config = ConfigDict(extra="ignore")

    taskId: str | None = None
    duration: int | None = None
    status: str | None = None


class TimerLogOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: str
    taskId: str
    userId: str
    duration: int
    status: str
    startTime: str | None = None
    endTime: str | None = None
    sessionDate: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
