from __future__ import annotations

"""Canvas LMS 客户端（与 Canvas API 通信的最小封装）。

这里的代码尽量保持“薄”：只负责
- 读取配置并生成鉴权 header
- 调用 Canvas 的 REST API（courses / assignments）
- 把作业描述中的 HTML 清洗为纯文本（便于落库和检索）

更复杂的业务逻辑（例如“把作业映射成任务、去重、更新数据库”）放在 router/service 层完成。
"""

import re

import httpx
from urllib.parse import quote

from app.config import get_settings


class CanvasNotConfiguredError(Exception):
    pass


def _normalize_base_url(value: str | None) -> str:
    return str(value or "").strip().rstrip("/")


def _get_auth_headers() -> dict[str, str]:
    """读取 Canvas 配置并生成 Authorization header。

    若缺少 CANVAS_BASE_URL / CANVAS_TOKEN，会抛 CanvasNotConfiguredError，
    上层 router 会转成 {"error": "..."}。
    """

    settings = get_settings()
    base_url = _normalize_base_url(settings.CANVAS_BASE_URL)
    token = str(settings.CANVAS_TOKEN or "").strip()
    missing = []
    if not base_url:
        missing.append("CANVAS_BASE_URL")
    if not token:
        missing.append("CANVAS_TOKEN")
    if missing:
        raise CanvasNotConfiguredError(f"Canvas not configured: missing {', '.join(missing)}")
    return {"Authorization": f"Bearer {token}"}


def canvas_base_url() -> str:
    settings = get_settings()
    base_url = _normalize_base_url(settings.CANVAS_BASE_URL)
    if not base_url:
        _get_auth_headers()
    return base_url


async def list_courses(client: httpx.AsyncClient) -> list[dict]:
    """调用 Canvas API 获取课程列表（原样返回 data）。"""

    resp = await client.get("/api/v1/courses", params={"per_page": 100})
    resp.raise_for_status()
    return resp.json() or []


async def list_assignments(client: httpx.AsyncClient, course_id: str | int) -> list[dict]:
    """调用 Canvas API 获取某门课的作业列表。"""

    cid = quote(str(course_id), safe="")
    resp = await client.get(f"/api/v1/courses/{cid}/assignments", params={"per_page": 100})
    resp.raise_for_status()
    return resp.json() or []


_tag_re = re.compile(r"<[^>]+>")
_script_re = re.compile(r"<script[\s\S]*?</script>", re.IGNORECASE)
_style_re = re.compile(r"<style[\s\S]*?</style>", re.IGNORECASE)


def html_to_text(html: str | None) -> str:
    """把 Canvas 的 HTML description 转为纯文本（用于落库和检索）。"""

    if not html:
        return ""
    s = str(html)
    s = _script_re.sub(" ", s)
    s = _style_re.sub(" ", s)
    s = _tag_re.sub(" ", s)
    s = (
        s.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )
    s = re.sub(r"\s+", " ", s).strip()
    return s
