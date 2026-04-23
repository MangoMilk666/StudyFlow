from __future__ import annotations

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


@router.get("/summary")
async def get_stats_summary(
    range: str = Query(default="week", pattern="^(day|week|month)$"),
    current_user: dict = Depends(get_current_user),
):
    days = _range_days(range)
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    try:
        db = await get_db_checked()
    except MongoNotReadyError:
        raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")

    user_oid = to_object_id(current_user["userId"])

    total = await db.tasks.count_documents({"userId": user_oid})
    done = await db.tasks.count_documents({"userId": user_oid, "status": {"$in": ["Done", "done"]}})
    undone = max(int(total) - int(done), 0)

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
        raise ApiError(500, f"统计数据聚合失败：{e}")

    module_time_spent = [
        {"module": str(d.get("_id") or ""), "minutes": _to_float(d.get("minutes") or 0)} for d in module_agg
    ]

    top_tasks = (
        await db.tasks.find({"userId": user_oid})
        .sort("timeSpent", -1)
        .limit(5)
        .to_list(length=5)
    )
    top_tasks_by_time = [
        {
            "taskId": oid_str(t.get("_id")),
            "title": str(t.get("title") or ""),
            "minutes": _to_float(t.get("timeSpent") or 0),
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
                    "updatedAt": {"$gte": start, "$lte": now},
                }
            },
            {
                "$addFields": {
                    "updatedAtSafe": {
                        "$convert": {"input": "$updatedAt", "to": "date", "onError": "$createdAt", "onNull": "$createdAt"}
                    }
                }
            },
            {"$addFields": {"day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$updatedAtSafe"}}}},
            {"$group": {"_id": "$day", "count": {"$sum": 1}}},
        ]
    ).to_list(length=None)
    done_map = {str(x.get("_id")): int(x.get("count") or 0) for x in done_by_day}

    created_by_day = await db.tasks.aggregate(
        [
            {"$match": {"userId": user_oid, "createdAt": {"$gte": start, "$lte": now}}},
            {
                "$addFields": {
                    "createdAtSafe": {
                        "$convert": {"input": "$createdAt", "to": "date", "onError": now, "onNull": now}
                    }
                }
            },
            {"$addFields": {"day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAtSafe"}}}},
            {"$group": {"_id": "$day", "count": {"$sum": 1}}},
        ]
    ).to_list(length=None)
    created_map = {str(x.get("_id")): int(x.get("count") or 0) for x in created_by_day}

    trend = []
    cursor = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    end_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    while cursor <= end_day:
        key = _date_key(cursor)
        trend.append({"date": key, "done": done_map.get(key, 0), "created": created_map.get(key, 0)})
        cursor = cursor + timedelta(days=1)

    return {
        "range": range,
        "total": int(total),
        "done": int(done),
        "undone": int(undone),
        "moduleTimeSpent": module_time_spent,
        "topTasksByTime": top_tasks_by_time,
        "trend": trend,
    }
