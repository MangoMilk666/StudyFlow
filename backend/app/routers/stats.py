from __future__ import annotations

"""统计相关路由（/api/stats/*）。

提供两类统计：
- /summary：统计页需要的四象限数据（完成/未完成、按模块耗时、Top 耗时任务、趋势）
  - 另外增加“番茄钟维度”的汇总：focusMinutes / pomodorosCompleted
- /task/{taskId}：某个任务的专注统计（累计所有 timerlogs；完成次数仅统计 completed）

实现要点：
- 使用 MongoDB aggregate 做分组统计（尽量减少 Python 端计算与 IO）
- 对历史脏数据做容错：$convert / onError / onNull，避免聚合直接 500
- 统计“按天”时使用本地时区（timezone 参数），避免用户看到的日期与实际不一致
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query

from app.deps import get_current_user
from app.errors import ApiError
from app.services.db import MongoNotReadyError, get_db_checked
from app.utils.mongo import oid_str, to_object_id

router = APIRouter()


def _range_days(value: str) -> int:
    v = (value or "").strip().lower()
    if v == "day":
        return 1
    if v == "month":
        return 30
    return 7


def _date_key(dt: datetime) -> str:
    return dt.date().isoformat()

def _to_float(value) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0

def _round_minutes(value) -> float:
    try:
        return float(round(float(value), 2))
    except Exception:
        return 0.0

def _round_minutes_int_from_seconds(seconds: int) -> int:
    try:
        return int(round(float(seconds) / 60.0))
    except Exception:
        return 0


def _tz_offset_str(dt: datetime) -> str:
    offset = dt.utcoffset() or timedelta(0)
    total = int(offset.total_seconds())
    sign = "+" if total >= 0 else "-"
    total = abs(total)
    hh = total // 3600
    mm = (total % 3600) // 60
    return f"{sign}{hh:02d}:{mm:02d}"


@router.get("/summary")
async def get_stats_summary(
    range: str = Query(default="week", pattern="^(day|week|month)$"),
    current_user: dict = Depends(get_current_user),
):
    days = _range_days(range)
    # 用本地时区做“按天统计”：否则用户会看到日期偏移（尤其是 UTC+8 等时区）
    now_local = datetime.now().astimezone()
    tz_str = _tz_offset_str(now_local)
    # 从本地当天 00:00 开始统计，再转换为 UTC 去匹配 Mongo 里存的 UTC 时间
    start_local = (now_local - timedelta(days=max(days - 1, 0))).replace(hour=0, minute=0, second=0, microsecond=0)
    start_utc = start_local.astimezone(timezone.utc)
    now_utc = now_local.astimezone(timezone.utc)

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")

    user_oid = to_object_id(current_user["userId"])

    # 这里用 count_documents 而不是 find+len：避免把数据拉到 Python（更快更省内存）
    total = await db.tasks.count_documents({"userId": user_oid})
    done = await db.tasks.count_documents({"userId": user_oid, "status": {"$in": ["Done", "done"]}})
    undone = max(int(total) - int(done), 0)

    # 番茄钟维度：
    # - focusMinutes 统计所有 timerlogs 的累计时长（包含中断）
    # - pomodorosCompleted 只统计 completed（自然完成的 25min）
    focus_agg = await db.timerlogs.aggregate(
        [
            {"$match": {"userId": user_oid}},
            {
                "$addFields": {
                    # sessionDate 可能被写成 string/null：统一转成 date，避免聚合直接报错
                    "sessionDateSafe": {
                        "$convert": {"input": "$sessionDate", "to": "date", "onError": {"$toDate": "$_id"}, "onNull": {"$toDate": "$_id"}}
                    },
                    # duration 统一转 int：避免出现小数/字符串导致 $sum 报错
                    "durationSafe": {"$convert": {"input": "$duration", "to": "int", "onError": 0, "onNull": 0}},
                }
            },
            {"$match": {"sessionDateSafe": {"$gte": start_utc, "$lte": now_utc}}},
            {
                "$group": {
                    "_id": None,
                    "seconds": {"$sum": "$durationSafe"},
                    "pomodorosCompleted": {
                        "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                    },
                }
            },
        ]
    ).to_list(length=1)
    focus_seconds = int((focus_agg[0] if focus_agg else {}).get("seconds") or 0)
    pomodoros_completed = int((focus_agg[0] if focus_agg else {}).get("pomodorosCompleted") or 0)

    try:
        module_agg = await db.tasks.aggregate(
            [
                {"$match": {"userId": user_oid}},
                {
                    "$lookup": {
                        "from": "modules",
                        "localField": "module",
                        "foreignField": "_id",
                        "as": "moduleDoc",
                    }
                },
                {"$unwind": {"path": "$moduleDoc", "preserveNullAndEmptyArrays": True}},
                {
                    "$addFields": {
                        "moduleLabel": {
                            "$ifNull": ["$moduleDoc.name", {"$ifNull": ["$moduleName", "Uncategorized"]}]
                        },
                        # timeSpent 可能因为历史数据/错误写入而变成 string/null，这里用 $convert 做容错转换。
                        "timeSpentMinutes": {
                            "$convert": {"input": "$timeSpent", "to": "double", "onError": 0, "onNull": 0}
                        },
                    }
                },
                {"$group": {"_id": "$moduleLabel", "minutes": {"$sum": "$timeSpentMinutes"}}},
                {"$sort": {"minutes": -1}},
            ]
        ).to_list(length=None)
    except Exception as e:
        # 这里把 motor 的异常信息原样带出：便于你在联调时快速定位聚合 pipeline 的问题点
        raise ApiError(500, f"统计数据聚合失败：{e}")

    module_time_spent = [
        {"module": str(d.get("_id") or ""), "minutes": _round_minutes(d.get("minutes") or 0)} for d in module_agg
    ]

    top_tasks = (
        await db.tasks.find({"userId": user_oid})
        # Top5 直接按 timeSpent 排序：依赖 tasks.timeSpent 在 /api/timer/stop 时累计维护
        .sort("timeSpent", -1)
        .limit(5)
        .to_list(length=5)
    )
    top_tasks_by_time = [
        {
            "taskId": oid_str(t.get("_id")),
            "title": str(t.get("title") or ""),
            "minutes": _round_minutes(t.get("timeSpent") or 0),
            "moduleName": str(t.get("moduleName") or ""),
        }
        for t in top_tasks
    ]

    done_by_day = await db.tasks.aggregate(
        [
            {
                "$match": {
                    "userId": user_oid,
                    "status": {"$in": ["Done", "done"]},
                }
            },
            {
                "$addFields": {
                    # updatedAt 用于 Done 趋势：手动改状态/同步更新都能覆盖
                    "updatedAtSafe": {
                        "$convert": {
                            "input": "$updatedAt",
                            "to": "date",
                            "onError": {"$toDate": "$_id"},
                            "onNull": {"$toDate": "$_id"},
                        }
                    }
                }
            },
            {"$match": {"updatedAtSafe": {"$gte": start_utc, "$lte": now_utc}}},
            {"$addFields": {"day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$updatedAtSafe", "timezone": tz_str}}}},
            {"$group": {"_id": "$day", "count": {"$sum": 1}}},
        ]
    ).to_list(length=None)
    done_map = {str(x.get("_id")): int(x.get("count") or 0) for x in done_by_day}

    created_by_day = await db.tasks.aggregate(
        [
            {"$match": {"userId": user_oid}},
            {
                "$addFields": {
                    # createdAt 用于 Created 趋势：注意要按本地 timezone 分组，否则会出现“今天创建被算到昨天”的错觉
                    "createdAtSafe": {
                        "$convert": {
                            "input": "$createdAt",
                            "to": "date",
                            "onError": {"$toDate": "$_id"},
                            "onNull": {"$toDate": "$_id"},
                        }
                    }
                }
            },
            {"$match": {"createdAtSafe": {"$gte": start_utc, "$lte": now_utc}}},
            {"$addFields": {"day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAtSafe", "timezone": tz_str}}}},
            {"$group": {"_id": "$day", "count": {"$sum": 1}}},
        ]
    ).to_list(length=None)
    created_map = {str(x.get("_id")): int(x.get("count") or 0) for x in created_by_day}

    trend = []
    cursor = start_local.date()
    end_day = now_local.date()
    while cursor <= end_day:
        key = cursor.isoformat()
        trend.append({"date": key, "done": done_map.get(key, 0), "created": created_map.get(key, 0)})
        cursor = cursor + timedelta(days=1)

    return {
        "range": range,
        "total": int(total),
        "done": int(done),
        "undone": int(undone),
        "focusSeconds": focus_seconds,
        "focusMinutes": _round_minutes_int_from_seconds(focus_seconds),
        "pomodorosCompleted": pomodoros_completed,
        "moduleTimeSpent": module_time_spent,
        "topTasksByTime": top_tasks_by_time,
        "trend": trend,
    }


@router.get("/task/{taskId}")
async def get_task_stats(taskId: str, current_user: dict = Depends(get_current_user)):
    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")

    user_oid = to_object_id(current_user["userId"])
    task_oid = to_object_id(taskId)
    task = await db.tasks.find_one({"_id": task_oid})
    if not task:
        raise ApiError(404, "Task not found")
    if oid_str(task.get("userId")) != current_user["userId"]:
        raise ApiError(403, "Forbidden")

    agg = await db.timerlogs.aggregate(
        [
            {"$match": {"userId": user_oid, "taskId": task_oid}},
            {
                "$addFields": {
                    "durationSafe": {"$convert": {"input": "$duration", "to": "int", "onError": 0, "onNull": 0}},
                    "statusSafe": {"$ifNull": ["$status", ""]},
                }
            },
            {
                "$group": {
                    "_id": None,
                    "seconds": {"$sum": "$durationSafe"},
                    "pomodorosCompleted": {
                        "$sum": {"$cond": [{"$eq": ["$statusSafe", "completed"]}, 1, 0]}
                    },
                }
            },
        ]
    ).to_list(length=1)

    total_seconds = int((agg[0] if agg else {}).get("seconds") or 0)
    pomodoros = int((agg[0] if agg else {}).get("pomodorosCompleted") or 0)
    return {
        "taskId": taskId,
        "totalSeconds": total_seconds,
        "totalMinutes": _round_minutes_int_from_seconds(total_seconds),
        "pomodorosCompleted": pomodoros,
    }
