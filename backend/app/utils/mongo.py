from __future__ import annotations

from bson import ObjectId


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
        return value.isoformat()
    except Exception:
        return value

