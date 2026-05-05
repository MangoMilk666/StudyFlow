from __future__ import annotations

"""时间相关小工具。

这里目前只提供 parse_datetime：
- 将 ISO 字符串解析为 datetime（支持末尾 'Z'）
- 解析失败返回 None（由上层决定如何处理）
"""

from datetime import datetime


def parse_datetime(value: str | None):
    '''
    将字符串解析为datetime类实例
    '''
    if not value:
        return None
    s = str(value).strip()
    if not s:
        return None
    # 标准化处理，兼容老版本py
    # 带 Z 的格式 (UTC)： 2026-05-05T12:00:00Z
    # 等效的数值偏移格式：2026-05-05T12:00:00 + 00: 00
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None
