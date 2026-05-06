from __future__ import annotations

from pathlib import Path


_cached_version: str | None = None


def _read_version_file(path: Path) -> str | None:
    try:
        if not path.exists() or not path.is_file():
            return None
        raw = path.read_text(encoding="utf-8", errors="ignore").strip()
        return raw or None
    except Exception:
        return None


def get_app_version() -> str:
    global _cached_version

    if _cached_version:
        return _cached_version

    candidates: list[Path] = []
    try:
        candidates.append(Path("/app/VERSION.txt"))
    except Exception:
        pass

    try:
        candidates.append(Path.cwd() / "VERSION.txt")
    except Exception:
        pass

    here = Path(__file__).resolve()
    for p in here.parents:
        candidates.append(p / "VERSION.txt")

    for p in candidates:
        v = _read_version_file(p)
        if v:
            _cached_version = v
            return v

    _cached_version = "unknown"
    return _cached_version

