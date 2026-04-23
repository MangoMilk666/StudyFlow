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
    - duration：本次计时分钟数（float/int）
    """

    model_config = ConfigDict(extra="ignore")

    taskId: str | None = None
    duration: int | float | None = None
