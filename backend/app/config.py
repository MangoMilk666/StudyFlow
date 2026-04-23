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

    MONGO_URI: str = "mongodb://localhost:27017/studyflow"
    MONGO_DB: str | None = None

    # 注意：生产环境务必使用强随机密钥。
    JWT_SECRET: str = Field(default="secret_key", repr=False)
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 24 * 60

    CANVAS_BASE_URL: str | None = None
    CANVAS_TOKEN: str | None = Field(default=None, repr=False)

    OPENAI_API_KEY: str | None = Field(default=None, repr=False)
    OPENAI_MODEL: str = "gpt-4.1-mini"

    CHROMA_PERSIST_DIR: str = ".chroma"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"


_settings: Settings | None = None


def get_settings() -> Settings:
    """获取全局 Settings 单例。

    FastAPI 运行期会频繁读取配置，做缓存可以减少开销。
    """

    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
