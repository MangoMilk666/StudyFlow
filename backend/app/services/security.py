from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _bcrypt_secret(value: str | bytes) -> bytes:
    """把密码转换为 bcrypt 可接受的 bytes，并按 72 bytes 截断。

    背景：bcrypt 只会使用前 72 字节。
    为了避免 passlib/bcrypt 在部分版本组合下抛出异常，这里做显式截断。
    """

    if isinstance(value, bytes):
        return value[:72]
    return value.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    """对明文密码进行 bcrypt 哈希。"""

    return pwd_context.hash(_bcrypt_secret(password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """校验明文密码与 bcrypt 哈希是否匹配。"""

    return pwd_context.verify(_bcrypt_secret(plain_password), hashed_password)


def create_access_token(*, user_id: str, email: str) -> str:
    """签发 JWT（payload 字段与旧 Express 保持一致：userId/email/iat/exp）。"""

    settings = get_settings()
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)

    payload = {
        "userId": user_id,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


class UnauthorizedError(Exception):
    pass


def decode_token(token: str) -> dict:
    """解析并校验 JWT。

    校验失败会抛 UnauthorizedError，由上层转成 401 {"error": "Unauthorized"}。
    """

    settings = get_settings()
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise UnauthorizedError("Unauthorized") from e
