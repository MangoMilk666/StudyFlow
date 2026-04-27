from __future__ import annotations

"""时间相关小工具。

这里目前只提供 parse_datetime：
- 将 ISO 字符串解析为 datetime（支持末尾 'Z'）
- 解析失败返回 None（由上层决定如何处理）
"""

from datetime import datetime


def parse_datetime(value: str | None):
    if not value:
        return None
    s = str(value).strip()
    if not s:
        return None
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None
