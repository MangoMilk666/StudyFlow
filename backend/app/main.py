from __future__ import annotations

"""FastAPI 应用入口。

你可以把这个文件理解为 Express 的 server.js：
- 创建 app
- 注册中间件（CORS 等）
- 注册全局错误处理
- 挂载各业务路由（/api/auth, /api/tasks, /api/timer, /api/stats, /api/ai ...）
- 管理生命周期：启动时初始化 Mongo，退出时关闭连接

额外说明：
- FastAPI 的 lifespan 类似“启动/关闭钩子”，适合做数据库连接初始化。
- MOCK_MODE 用于无 Mongo 的情况下跑一套内存 mock API，方便联调前端。
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.errors import ApiError, api_error_handler
from app.routers import ai, auth, canvas, modules, stats, tasks, timer
from app.services.db import close_mongo, init_mongo, ping_mongo


@asynccontextmanager
async def lifespan(_: FastAPI):
    """应用生命周期钩子。

    - 非 MOCK_MODE：初始化 Mongo 客户端，并尽可能在启动阶段完成一次 ping（快速暴露连接问题）。
    - 无论如何：退出时关闭 Mongo 客户端。
    """

    settings = get_settings()
    if not settings.MOCK_MODE:
        init_mongo()
        try:
            await ping_mongo()
        except Exception:
            pass
    yield
    close_mongo()


def create_app() -> FastAPI:
    """创建 FastAPI 应用。

    这里负责：
    - CORS 配置
    - 全局错误处理（统一返回 {"error": "..."}）
    - 路由挂载（按 MOCK_MODE 选择 mock 或真实路由）
    """

    settings = get_settings()

    # passlib/bcrypt 在部分版本组合下会打印不影响功能的版本探测 traceback。
    # 为了联调时更清爽，降低其日志等级。
    logging.getLogger("passlib").setLevel(logging.ERROR)
    logging.getLogger("passlib.handlers.bcrypt").setLevel(logging.ERROR)

    app = FastAPI(lifespan=lifespan)

    app.add_exception_handler(ApiError, api_error_handler)
    # allow CORS
    origins = [o.strip() for o in (settings.CORS_ORIGINS or "").split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"] ,
        allow_headers=["*"] ,
    )

    @app.get("/api/health")
    async def health():
        """健康检查。

        与原 Express 保持兼容：返回 status + timestamp。
        """

        status = "mock-backend" if settings.MOCK_MODE else "backend-running"
        return {"status": status, "timestamp": datetime.now(timezone.utc).isoformat()}

    if settings.MOCK_MODE:
        from app.routers import mock

        # MOCK_MODE：挂载 /api 下的 mock router（字段/状态码与旧版 mock.js 保持一致）
        app.include_router(mock.router, prefix="/api")
    else:
        # 真实模式：挂载核心业务路由
        app.include_router(auth.router, prefix="/api/auth")
        app.include_router(tasks.router, prefix="/api/tasks")
        app.include_router(modules.router, prefix="/api/modules")
        app.include_router(timer.router, prefix="/api/timer")
        app.include_router(canvas.router, prefix="/api/canvas")
        app.include_router(ai.router, prefix="/api/ai")
        app.include_router(stats.router, prefix="/api/stats")

    return app


app = create_app()
