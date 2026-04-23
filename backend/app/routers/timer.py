from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Body, Depends

from app.deps import get_current_user
from app.errors import ApiError
from app.models.timer import TimerLogOut, TimerStartRequest, TimerStopRequest
from app.services.db import MongoNotReadyError, get_db_checked
from app.utils.mongo import oid_str, serialize_datetime, to_object_id


router = APIRouter()

POMODORO_SECONDS = 25 * 60


@router.post("/start")
async def start_timer(
    payload: TimerStartRequest = Body(default_factory=TimerStartRequest),
    current_user: dict = Depends(get_current_user),
):
    """开始计时。

    说明：与旧 Express 一致，这里不落库，仅返回 startTime 给前端。
    """

    return {
        "message": "Timer started",
        "startTime": datetime.now(timezone.utc),
        "taskId": payload.taskId,
        "userId": current_user["userId"],
    }


@router.post("/stop")
async def stop_timer(
    payload: TimerStopRequest = Body(default_factory=TimerStopRequest),
    current_user: dict = Depends(get_current_user),
):
    """停止计时并写入 TimerLog，同时累加任务的 timeSpent（分钟）。"""

    if not payload.taskId:
        raise ApiError(400, "taskId required")
    if payload.duration is None:
        raise ApiError(400, "duration required")

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    user_oid = to_object_id(current_user["userId"])
    task = await db.tasks.find_one({"_id": to_object_id(payload.taskId)})
    if not task:
        raise ApiError(404, "Task not found")
    if oid_str(task.get("userId")) != current_user["userId"]:
        raise ApiError(403, "Forbidden")

    duration = int(payload.duration)
    if duration < 0:
        raise ApiError(400, "duration must be >= 0")
    if duration > POMODORO_SECONDS:
        duration = POMODORO_SECONDS

    status = "completed" if duration >= POMODORO_SECONDS else "interrupted"
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(seconds=duration)
    now = end_time
    timer_doc = {
        "taskId": to_object_id(payload.taskId),
        "userId": user_oid,
        "duration": duration,
        "status": status,
        "startTime": start_time,
        "endTime": end_time,
        "sessionDate": now,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.timerlogs.insert_one(timer_doc)
    timer_log = await db.timerlogs.find_one({"_id": result.inserted_id})
    timer_log = timer_log or {**timer_doc, "_id": result.inserted_id}

    new_time_spent = float(task.get("timeSpent") or 0) + (float(duration) / 60.0)
    await db.tasks.update_one(
        {"_id": to_object_id(payload.taskId)},
        {"$set": {"timeSpent": new_time_spent, "updatedAt": now}},
    )

    return {
        "message": "Timer session saved",
        "timerLog": TimerLogOut(
            id=oid_str(timer_log.get("_id")),
            taskId=oid_str(timer_log.get("taskId")),
            userId=oid_str(timer_log.get("userId")),
            duration=int(timer_log.get("duration") or 0),
            status=str(timer_log.get("status") or ""),
            startTime=serialize_datetime(timer_log.get("startTime")),
            endTime=serialize_datetime(timer_log.get("endTime")),
            sessionDate=serialize_datetime(timer_log.get("sessionDate")),
            createdAt=serialize_datetime(timer_log.get("createdAt")),
            updatedAt=serialize_datetime(timer_log.get("updatedAt")),
        ).model_dump(by_alias=True),
        "totalTimeSpent": float(new_time_spent),
    }


@router.get("/logs/{taskId}")
async def get_timer_logs(taskId: str, current_user: dict = Depends(get_current_user)):
    """获取某个任务的计时记录列表（按 sessionDate 倒序）。"""

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    user_oid = to_object_id(current_user["userId"])
    docs = (
        await db.timerlogs.find({"taskId": to_object_id(taskId), "userId": user_oid})
        .sort("sessionDate", -1)
        .to_list(length=None)
    )
    out = []
    for d in docs:
        out.append(
            TimerLogOut(
                id=oid_str(d.get("_id")),
                taskId=oid_str(d.get("taskId")),
                userId=oid_str(d.get("userId")),
                duration=int(d.get("duration") or 0),
                status=str(d.get("status") or ""),
                startTime=serialize_datetime(d.get("startTime")),
                endTime=serialize_datetime(d.get("endTime")),
                sessionDate=serialize_datetime(d.get("sessionDate")),
                createdAt=serialize_datetime(d.get("createdAt")),
                updatedAt=serialize_datetime(d.get("updatedAt")),
            ).model_dump(by_alias=True)
        )
    return out


@router.get("/weekly-stats/{userId}")
async def weekly_stats(userId: str, current_user: dict = Depends(get_current_user)):
    """获取过去 7 天的计时统计。

    注意：与旧 Express 保持一致，这里的 path 参数 userId 不实际使用，
    以 token 中的 userId 为准。
    返回结构：{"YYYY-MM-DD": count}
    """

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
    user_oid = to_object_id(current_user["userId"])
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    docs = await db.timerlogs.find({"userId": user_oid, "sessionDate": {"$gte": seven_days_ago}}).to_list(
        length=None
    )

    stats: dict[str, int] = {}
    for d in docs:
        sd = d.get("sessionDate")
        if not sd:
            continue
        date_key = sd.isoformat().split("T")[0]
        stats[date_key] = stats.get(date_key, 0) + 1
    return stats
