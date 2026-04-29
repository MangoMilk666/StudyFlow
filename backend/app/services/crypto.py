from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings


_fernet: Fernet | None = None

'''
使用 Fernet 对称加密
主密钥来源： USER_SECRETS_KEY
'''
def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        settings = get_settings()
        _fernet = Fernet(settings.user_secrets_key)
    return _fernet


def encrypt_text(value: str) -> str:
    f = _get_fernet()
    token = f.encrypt(str(value).encode("utf-8"))
    return token.decode("utf-8")


def decrypt_text(token: str) -> str:
    f = _get_fernet()
    try:
        raw = f.decrypt(str(token).encode("utf-8"))
    except InvalidToken as e:
        raise ValueError("invalid token") from e
    return raw.decode("utf-8")

