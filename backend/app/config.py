"""应用配置（Settings）。

这里集中管理后端运行所需的环境变量与默认值，例如：
- MongoDB 连接串
- JWT 密钥/算法/过期时间
- Canvas / OpenAI / Chroma 等可选能力的配置
- CORS 允许来源

在 FastAPI 中通常会把配置封装成一个 Settings 类，并通过 get_settings() 提供单例，
以避免每次请求都重复解析环境变量。
"""

from __future__ import annotations

import os
import base64
import hashlib
from pathlib import Path
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """后端配置类。

    设计目标：
    - 默认从环境变量读取
    - 同时支持从项目内的 .env / .env.local / .env.prod 等文件读取（便于联调）
    - extra=ignore：避免前端/compose 注入了无关变量导致报错
    """

    model_config = SettingsConfigDict(
        env_file=(
            ".env",
            "../.env",
            "../.env.prod",
            "../.env.local",
            "./.env.local",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PORT: int = 8000

    MOCK_MODE: bool = False

    MONGO_URI: str | None = None
    MONGO_DB: str | None = None
    MONGO_HOST: str | None = None
    MONGO_PORT: int = 27017
    MONGO_DBNAME: str = "studyflow"
    MONGO_USERNAME: str | None = Field(default=None, repr=False)
    MONGO_PASSWORD: str | None = Field(default=None, repr=False)
    MONGO_AUTH_SOURCE: str | None = "admin"

    # 注意：生产环境务必使用强随机密钥。
    JWT_SECRET: str = Field(default="secret_key", repr=False)
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 24 * 60
    USER_SECRETS_KEY: str | None = Field(default=None, repr=False)

    CANVAS_BASE_URL: str | None = None
    CANVAS_TOKEN: str | None = Field(default=None, repr=False)

    OPENAI_API_KEY: str | None = Field(default=None, repr=False)
    OPENAI_MODEL: str = "gpt-4.1-mini"
    OPENAI_BASE_URL: str | None = None
    OPENAI_EMBED_MODEL: str | None = None

    CHROMA_PERSIST_DIR: str = ".chroma"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def mongo_uri(self) -> str:
        raw_uri = str(self.MONGO_URI or "").strip()
        if raw_uri:
            username = (self.MONGO_USERNAME or "").strip() or None
            password = (self.MONGO_PASSWORD or "").strip() or None
            auth_source = (self.MONGO_AUTH_SOURCE or "").strip() or None

            try:
                from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

                p = urlparse(raw_uri)
                netloc = p.netloc
                has_credentials = "@" in netloc

                if has_credentials and netloc.count("@") > 1:
                    raise ValueError(
                        "Invalid MONGO_URI: credentials contain an unescaped '@'. "
                        "Percent-encode '@' as '%40' or provide credentials via MONGO_USERNAME/MONGO_PASSWORD."
                    )

                if (not has_credentials) and username and password:
                    user_part = quote_plus(username)
                    pass_part = quote_plus(password)
                    netloc = f"{user_part}:{pass_part}@{netloc}"

                if netloc != p.netloc or auth_source:
                    query_pairs = dict(parse_qsl(p.query, keep_blank_values=True))
                    if auth_source and "authSource" not in query_pairs:
                        query_pairs["authSource"] = auth_source
                    new_query = urlencode(query_pairs, doseq=True)
                    return urlunparse(
                        (p.scheme, netloc or p.netloc, p.path, p.params, new_query, p.fragment)
                    )
            except Exception:
                return raw_uri

            return raw_uri

        in_container = (
            str(os.environ.get("IN_DOCKER") or "").lower() in {"1", "true", "yes"}
            or Path("/.dockerenv").exists()
        )
        host = self.MONGO_HOST or ("host.docker.internal" if in_container else "127.0.0.1")
        port = int(self.MONGO_PORT or 27017)
        dbname = str(self.MONGO_DBNAME or "studyflow").strip() or "studyflow"

        username = (self.MONGO_USERNAME or "").strip() or None
        password = (self.MONGO_PASSWORD or "").strip() or None
        auth_source = (self.MONGO_AUTH_SOURCE or "").strip() or None

        if username and password:
            user_part = quote_plus(username)
            pass_part = quote_plus(password)
            if auth_source:
                return f"mongodb://{user_part}:{pass_part}@{host}:{port}/{dbname}?authSource={quote_plus(auth_source)}"
            return f"mongodb://{user_part}:{pass_part}@{host}:{port}/{dbname}"
        return f"mongodb://{host}:{port}/{dbname}"

    @property
    def user_secrets_key(self) -> bytes:
        raw = (self.USER_SECRETS_KEY or "").strip()
        if raw:
            return raw.encode("utf-8")
        digest = hashlib.sha256(f"{self.JWT_SECRET}|studyflow-user-secrets".encode("utf-8")).digest()
        return base64.urlsafe_b64encode(digest)


_settings: Settings | None = None


def get_settings() -> Settings:
    """获取全局 Settings 单例。

    FastAPI 运行期会频繁读取配置，做缓存可以减少开销。
    """

    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
