from __future__ import annotations

"""Canvas 集成相关路由（/api/canvas/*）。

用途：
- 从 Canvas 拉取课程/作业信息
- 允许前端先“预览”作业，再确认导入为 tasks

边界：
- 本文件包含“对 Canvas API 的调用 + 入库逻辑”，但底层 HTTP 调用细节在 services/canvas_client.py
- 需要在环境变量中配置 CANVAS_BASE_URL / CANVAS_TOKEN
"""

from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Body, Depends

from app.deps import get_current_user
from app.errors import ApiError
from app.services.canvas_client import (
    CanvasNotConfiguredError,
    canvas_base_url,
    html_to_text,
    list_assignments,
    list_courses,
    _get_auth_headers,
)
from app.services.db import MongoNotReadyError, get_db_checked
from app.utils.datetime import parse_datetime
from app.utils.mongo import oid_str, to_object_id


router = APIRouter()


def _pick_courses(all_courses: list[dict], course_ids) -> list[dict]:
    ids = [str(x) for x in (course_ids or [])] if isinstance(course_ids, list) else []
    if not ids:
        return all_courses
    return [c for c in all_courses if str(c.get("id")) in ids]

def _canvas_http_error(e: httpx.HTTPStatusError) -> ApiError:
    """把 Canvas API 的非 2xx 响应转换为更可读的 ApiError。

    说明：
    - 之前统一返回 502 + status_code，会让用户难以定位是 token 失效、权限不足还是限流。
    - 这里按常见状态码做分流，并附带少量响应片段（不包含敏感 token）。
    """

    status = int(getattr(e.response, "status_code", 0) or 0)
    try:
        body = (e.response.text or "").strip()
    except Exception:
        body = ""
    snippet = body[:220] if body else ""

    # 注意：这里的 401/403 是“Canvas 上游”的鉴权失败，不是我们系统的 JWT 失败。
    # 不能返回 401，否则前端会误以为登录过期并强制跳回 /auth。
    if status in (401, 403):
        return ApiError(502, "Canvas token 无效或权限不足：请检查 CANVAS_TOKEN（以及是否有课程访问权限）")
    if status == 429:
        return ApiError(503, "Canvas API 触发限流（429）：请稍后重试")
    if status >= 500:
        return ApiError(502, f"Canvas 服务异常：HTTP {status}")
    if snippet:
        return ApiError(502, f"Canvas API error: HTTP {status} - {snippet}")
    return ApiError(502, f"Canvas API error: HTTP {status}")


@router.get("/courses")
async def get_courses(current_user: dict = Depends(get_current_user)):
    """获取 Canvas 课程列表（需要 Bearer JWT + 配置 CANVAS_*）。"""

    try:
        async with httpx.AsyncClient(
            base_url=canvas_base_url(),
            headers=_get_auth_headers(),
            timeout=8.0,
        ) as client:
            courses = await list_courses(client)
        return [
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "course_code": c.get("course_code"),
                "workflow_state": c.get("workflow_state"),
            }
            for c in courses
        ]
    except CanvasNotConfiguredError as e:
        raise ApiError(500, str(e))
    except httpx.HTTPStatusError as e:
        raise _canvas_http_error(e)
    except Exception as e:
        raise ApiError(500, str(e))


@router.post("/preview-assignments")
async def preview_assignments(
    payload: dict = Body(default_factory=dict),
    current_user: dict = Depends(get_current_user),
):
    """预览 Canvas 作业（不写入数据库）。

    返回结构与 Express 版保持一致：{ ok: true, assignments: [...] }
    """

    try:
        course_ids = (payload or {}).get("courseIds")
        async with httpx.AsyncClient(
            base_url=canvas_base_url(),
            headers=_get_auth_headers(),
            timeout=8.0,
        ) as client:
            all_courses = await list_courses(client)
            selected_courses = _pick_courses(all_courses, course_ids)

            out: list[dict] = []
            for course in selected_courses:
                assignments = await list_assignments(client, course.get("id"))
                for a in assignments:
                    assignment_id = str(a.get("id") or "")
                    course_id = str(course.get("id") or "")
                    title = str(a.get("name") or "").strip()
                    if not assignment_id or not course_id or not title:
                        continue
                    out.append(
                        {
                            "courseId": course_id,
                            "courseName": str(course.get("name") or ""),
                            "assignmentId": assignment_id,
                            "name": title,
                            "due_at": a.get("due_at") or None,
                            "unlock_at": a.get("unlock_at") or None,
                        }
                    )
        return {"ok": True, "assignments": out}
    except CanvasNotConfiguredError as e:
        raise ApiError(500, str(e))
    except httpx.HTTPStatusError as e:
        raise _canvas_http_error(e)
    except Exception as e:
        raise ApiError(500, str(e))


@router.post("/sync-assignments")
async def sync_assignments(
    payload: dict = Body(default_factory=dict),
    current_user: dict = Depends(get_current_user),
):
    """从 Canvas 拉取作业并落库到 tasks。

    与 Express 版保持一致：
    - 用 source.type=canvas + courseId + assignmentId 做幂等键
    - 返回 { ok, created, updated, skipped }
    """

    try:
        course_ids = (payload or {}).get("courseIds")
        try:
            db = await get_db_checked()
        except MongoNotReadyError:
            raise ApiError(500, "MongoDB 连接失败，请检查 MONGO_URI 或确认数据库已启动")
        user_id = current_user["userId"]
        user_oid = to_object_id(user_id)

        async with httpx.AsyncClient(
            base_url=canvas_base_url(),
            headers=_get_auth_headers(),
            timeout=8.0,
        ) as client:
            all_courses = await list_courses(client)
            selected_courses = _pick_courses(all_courses, course_ids)

            created = 0
            updated = 0
            skipped = []

            for course in selected_courses:
                assignments = await list_assignments(client, course.get("id"))
                for a in assignments:
                    assignment_id = str(a.get("id") or "")
                    course_id = str(course.get("id") or "")
                    title = str(a.get("name") or "").strip()
                    if not assignment_id or not course_id or not title:
                        skipped.append({"courseId": course_id, "assignmentId": assignment_id})
                        continue

                    description = html_to_text(a.get("description"))
                    deadline = parse_datetime(a.get("due_at"))
                    unlock_at = parse_datetime(a.get("unlock_at"))

                    update_doc: dict = {
                        "userId": user_oid,
                        "title": title,
                        "description": description,
                        "deadline": deadline,
                        "moduleName": str(course.get("name") or ""),
                        "priority": "Medium",
                        "status": "To Do",
                        "source": {
                            "type": "canvas",
                            "courseId": course_id,
                            "assignmentId": assignment_id,
                        },
                        "updatedAt": datetime.now(timezone.utc),
                    }
                    if unlock_at is not None:
                        update_doc["unlockAt"] = unlock_at

                    existing = await db.tasks.find_one(
                        {
                            "userId": user_oid,
                            "source.type": "canvas",
                            "source.courseId": course_id,
                            "source.assignmentId": assignment_id,
                        }
                    )

                    if existing:
                        await db.tasks.update_one({"_id": existing.get("_id")}, {"$set": update_doc})
                        updated += 1
                    else:
                        now = datetime.now(timezone.utc)
                        await db.tasks.insert_one(
                            {
                                **update_doc,
                                "createdAt": now,
                                "timeSpent": 0,
                                "subtasks": [],
                            }
                        )
                        created += 1

        return {"ok": True, "created": created, "updated": updated, "skipped": len(skipped)}
    except CanvasNotConfiguredError as e:
        raise ApiError(500, str(e))
    except httpx.HTTPStatusError as e:
        raise _canvas_http_error(e)
    except Exception as e:
        raise ApiError(500, str(e))


@router.post("/import-assignments")
async def import_assignments(
    payload: dict = Body(default_factory=dict),
    current_user: dict = Depends(get_current_user),
):
    """兼容旧接口：importAssignments 复用 syncAssignments。"""

    return await sync_assignments(payload=payload, current_user=current_user)
