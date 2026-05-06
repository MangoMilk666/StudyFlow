from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ProfileOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    userId: str
    username: str
    email: str
    avatarUrl: str | None = None
    # 是否签署
    dataSharingAccepted: bool | None = None
    # 签署时间
    dataSharingAcceptedAt: str | None = None
    # 协议版本，为未来升级预留的审计字段
    dataSharingVersion: str | None = None

    focusTimerMode: str | None = None
    focusCustomMinutes: int | None = None


class AIConfigOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    usePersonalKey: bool
    hasApiKey: bool
    model: str | None = None


class AIConfigUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    usePersonalKey: bool | None = None
    apiKey: str | None = Field(default=None, repr=False)
    model: str | None = None


class UpdateUsernameRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    username: str | None = None


class ConsentUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    accepted: bool


class FocusTimerConfigUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    mode: str
    customMinutes: int | None = None


class DeviceOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    deviceName: str | None = None
    userAgent: str | None = None
    ip: str | None = None
    createdAt: str | None = None
    lastSeenAt: str | None = None
    revokedAt: str | None = None
    current: bool = False
