from __future__ import annotations

from app.services.crypto import decrypt_text
from app.services.db import get_db_checked
from app.utils.mongo import to_object_id


async def get_user_ai_config(user_id: str) -> dict:
    db = await get_db_checked()
    doc = await db.user_ai_configs.find_one({"userId": to_object_id(user_id)})
    if not doc:
        return {"usePersonalKey": False, "apiKey": None, "model": None}
    use_personal = bool(doc.get("usePersonalKey"))
    enc = doc.get("apiKeyEnc")
    api_key = None
    if use_personal and enc:
        api_key = decrypt_text(enc)
    model = doc.get("model")
    return {"usePersonalKey": use_personal, "apiKey": api_key, "model": model}

