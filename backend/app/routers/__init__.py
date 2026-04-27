"""路由模块聚合。

这个包用于把各业务 router 聚合在一起，便于在 main.py 中统一导入与挂载。
"""

from app.routers import ai, auth, canvas, modules, stats, tasks, timer

__all__ = ["auth", "tasks", "modules", "timer", "canvas", "ai", "stats"]
