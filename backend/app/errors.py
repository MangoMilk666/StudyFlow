from __future__ import annotations

"""统一错误结构。

为了保持与旧版 Express 后端兼容，本项目所有业务错误都尽量返回：
  {"error": "<message>"}

做法：
- 定义 ApiError（携带 status_code/message）
- 在 main.py 注册全局异常处理器 api_error_handler
"""

from fastapi import Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    """统一的 API 异常。

    抛出该异常后，会由全局 handler 转成：
      {"error": "..."}
    并带上指定的 HTTP 状态码。
    """

    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message


def api_error_handler(_: Request, exc: ApiError) -> JSONResponse:
    """把 ApiError 转成与旧 Express 一致的 JSON 结构。"""

    return JSONResponse(status_code=exc.status_code, content={"error": exc.message})
