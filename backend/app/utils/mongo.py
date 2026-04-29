from __future__ import annotations

"""MongoDB 相关工具函数。

motor/bson 会使用 ObjectId 作为主键类型：
- to_object_id：把字符串转成 ObjectId
- oid_str：把 ObjectId/任意值转成可 JSON 序列化的字符串
- serialize_datetime：把 datetime 转成 ISO 字符串（便于返回给前端）
"""

from bson import ObjectId
from datetime import datetime, timezone


def to_object_id(value: str) -> ObjectId:
    return ObjectId(str(value))


def oid_str(value) -> str:
    if isinstance(value, ObjectId):
        return str(value)
    return str(value)


def serialize_datetime(value):
    if value is None:
        return None
    try:
        if isinstance(value, datetime) and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    except Exception:
        return value
