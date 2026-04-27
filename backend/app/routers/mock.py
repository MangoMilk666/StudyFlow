from __future__ import annotations

"""MOCK_MODE 路由（内存版 API）。

目的：
- 在没有 MongoDB 的情况下，也能让前端完整跑通（登录/任务/模块/计时等）
- 字段/状态码尽量复刻旧 Express mock.js 的行为，减少前端适配成本

注意：这里的数据都在内存 state 里，重启服务会丢失。
"""

import random
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Body, Query, Response

from app.errors import ApiError


router = APIRouter()

# 说明：该 mock router 用于 MOCK_MODE=true 的开发/演示。
# 它刻意保留了旧版 Express mock.js 的字段风格与状态码差异（比如 tasks 的 id/name/priority）。


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _id(prefix: str) -> str:
    return f"{prefix}_{int(time.time() * 1000)}_{hex(random.randint(0, 0xFFFFFF))[2:]}"


state = {
    "users": [
        {
            "id": "demo_user",
            "username": "demo",
            "email": "demo@studyflow.local",
            "createdAt": _now_iso(),
        }
    ],
    "modules": [
        {"id": "m1", "userId": "demo_user", "name": "it5007", "color": "#b0d4ff", "createdAt": _now_iso()},
        {"id": "m2", "userId": "demo_user", "name": "it5003", "color": "#fff1b8", "createdAt": _now_iso()},
    ],
    "tasks": [
        {
            "id": "t1",
            "userId": "demo_user",
            "name": "KMP Algo",
            "deadline": "2026-03-20",
            "module": "it5003",
            "priority": "M",
            "status": "todo",
            "createdAt": "2026-03-19 16:50",
            "timeSpentSec": 0,
        },
        {
            "id": "t2",
            "userId": "demo_user",
            "name": "it5003 PS4",
            "deadline": "2026-03-21",
            "module": "it5003",
            "priority": "H",
            "status": "in_progress",
            "createdAt": "2026-03-19 08:20",
            "timeSpentSec": 0,
        },
        {
            "id": "t3",
            "userId": "demo_user",
            "name": "Meta Interview",
            "deadline": "2026-03-19",
            "module": "Job Seeking",
            "priority": "H",
            "status": "review",
            "createdAt": "2026-03-17 00:02",
            "timeSpentSec": 0,
        },
        {
            "id": "t4",
            "userId": "demo_user",
            "name": "cs5223 PS1",
            "deadline": "2026-03-18",
            "module": "cs5223",
            "priority": "L",
            "status": "done",
            "createdAt": "2026-03-16 11:30",
            "timeSpentSec": 0,
        },
    ],
    "timerLogs": [],
}


@router.post("/auth/register")
async def register(payload: dict = Body(default_factory=dict)):
    username = (payload or {}).get("username")
    email = (payload or {}).get("email")
    if not username or not email:
        raise ApiError(400, "username/email required")

    exists = any(u.get("email") == email for u in state["users"])
    if exists:
        raise ApiError(409, "email already registered")

    user = {"id": _id("u"), "username": username, "email": email, "createdAt": _now_iso()}
    state["users"].append(user)
    return {"user": user, "token": "mock_token"}


@router.post("/auth/login")
async def login(payload: dict = Body(default_factory=dict)):
    email = (payload or {}).get("email")
    user = next((u for u in state["users"] if u.get("email") == email), None) or state["users"][0]
    return {"user": user, "token": "mock_token"}


@router.get("/tasks")
async def list_tasks(userId: str = Query(default="demo_user")):
    return [t for t in state["tasks"] if t.get("userId") == userId]


@router.post("/tasks", status_code=201)
async def create_task(payload: dict = Body(default_factory=dict)):
    body = payload or {}
    task = {
        "id": _id("t"),
        "userId": body.get("userId") or "demo_user",
        "name": body.get("name") or "Untitled",
        "deadline": body.get("deadline"),
        "module": body.get("module"),
        "priority": body.get("priority") or "M",
        "status": body.get("status") or "todo",
        "createdAt": body.get("createdAt") or _now_iso(),
        "timeSpentSec": 0,
    }
    state["tasks"].append(task)
    return task


@router.get("/tasks/{id}")
async def get_task(id: str):
    task = next((t for t in state["tasks"] if t.get("id") == id), None)
    if not task:
        raise ApiError(404, "not found")
    return task


@router.put("/tasks/{id}")
async def update_task(id: str, payload: dict = Body(default_factory=dict)):
    idx = next((i for i, t in enumerate(state["tasks"]) if t.get("id") == id), -1)
    if idx < 0:
        raise ApiError(404, "not found")
    state["tasks"][idx] = {**state["tasks"][idx], **(payload or {})}
    return state["tasks"][idx]


@router.delete("/tasks/{id}", status_code=204)
async def delete_task(id: str):
    before = len(state["tasks"])
    state["tasks"] = [t for t in state["tasks"] if t.get("id") != id]
    if len(state["tasks"]) == before:
        raise ApiError(404, "not found")
    return Response(status_code=204)


@router.patch("/tasks/{id}/status")
async def update_task_status(id: str, payload: dict = Body(default_factory=dict)):
    idx = next((i for i, t in enumerate(state["tasks"]) if t.get("id") == id), -1)
    if idx < 0:
        raise ApiError(404, "not found")
    status = (payload or {}).get("status")
    state["tasks"][idx] = {**state["tasks"][idx], "status": status or state["tasks"][idx].get("status")}
    return state["tasks"][idx]


@router.get("/modules")
async def list_modules(userId: str = Query(default="demo_user")):
    return [m for m in state["modules"] if m.get("userId") == userId]


@router.post("/timer/start")
async def start_timer(payload: dict = Body(default_factory=dict)):
    body = payload or {}
    return {"ok": True, "taskId": body.get("taskId"), "userId": body.get("userId"), "startedAt": _now_iso()}


@router.post("/timer/stop")
async def stop_timer(payload: dict = Body(default_factory=dict)):
    body = payload or {}
    log = {
        "id": _id("log"),
        "taskId": body.get("taskId"),
        "userId": body.get("userId"),
        "durationSec": float(body.get("duration") or 0),
        "endTime": _now_iso(),
    }
    state["timerLogs"].append(log)
    return {"ok": True, "log": log}
