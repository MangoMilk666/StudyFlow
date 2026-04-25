from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings


class Mongo:
    """MongoDB 客户端的全局容器。

    说明：
    - motor 的 client 是线程安全/可复用的，建议全局单例复用连接池
    - ready/last_error 用于联调时更友好地提示“数据库未就绪/连接失败”
    """

    client: AsyncIOMotorClient | None = None
    ready: bool = False
    last_error: str | None = None


mongo = Mongo()


def init_mongo() -> None:
    """初始化 Mongo 客户端。

    这里设置了较短的超时，避免联调时数据库未启动导致请求长时间卡住。
    """

    settings = get_settings()
    mongo.client = AsyncIOMotorClient(
        settings.MONGO_URI,
        serverSelectionTimeoutMS=1500,
        connectTimeoutMS=1500,
    )
    mongo.ready = False
    mongo.last_error = None


def close_mongo() -> None:
    """关闭 Mongo 客户端（通常在应用退出时调用）。"""

    if mongo.client is not None:
        mongo.client.close()
        mongo.client = None
    mongo.ready = False
    mongo.last_error = None


async def ping_mongo() -> None:
    """尝试与 MongoDB 建立通信。
    引入 async/await 是为了利用 Event Loop（事件循环）。
    当一个请求在等待 AI 回复或数据库 I/O 时，单线程会立即跳去处理下一个请求，
    而不是原地阻塞。
    - 成功：mongo.ready=True
    - 失败：记录 last_error，并抛出异常（上层决定如何返回给用户）
    """

    if mongo.client is None:
        init_mongo()
    try:
        await mongo.client.admin.command("ping")
        mongo.ready = True
        mongo.last_error = None
    except Exception as e:
        mongo.ready = False
        mongo.last_error = str(e)
        raise


def get_db() -> AsyncIOMotorDatabase:
    """获取数据库对象（不做连通性检查）。

    注意：这个函数本身不会 ping，所以数据库没起来时，真正访问 collection 才会报错。
    真实业务接口建议优先用 get_db_checked()。
    """

    settings = get_settings()
    if mongo.client is None:
        init_mongo()

    if settings.MONGO_DB:
        return mongo.client[settings.MONGO_DB]

    default_db = mongo.client.get_default_database()
    if default_db is not None:
        return default_db

    return mongo.client["studyflow"]


class MongoNotReadyError(Exception):
    pass


async def get_db_checked() -> AsyncIOMotorDatabase:
    """获取数据库对象（带连通性检查）。

    目的：把“数据库未启动/连接串错误”等问题，转换成稳定可控的业务错误返回。
    """

    try:
        await ping_mongo()
    except Exception as e:
        raise MongoNotReadyError(mongo.last_error or str(e))
    return get_db()
