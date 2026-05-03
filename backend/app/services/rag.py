from __future__ import annotations

"""RAG（检索增强生成）相关：为每个用户构建 Retriever。

本模块会把用户的 tasks/modules 组织成“可检索的文本片段”，写入本地向量库（Chroma）。
AI 对话时（/api/ai/chat）会使用 Retriever 检索到的片段作为上下文，帮助回答“和我的任务有关”的问题。

注意：
- 未配置 OPENAI_API_KEY 时直接返回 None，这意味着 AI/RAG 功能关闭，但不影响其它业务接口。
- 这里使用本地 Chroma 持久化（CHROMA_PERSIST_DIR），方便开发/演示，无需外部向量数据库。
"""

from typing import Any

from app.config import get_settings
from app.services.db import get_db_checked
from app.utils.mongo import oid_str


async def build_user_documents(user_id: str) -> list[dict[str, Any]]:
    """从 MongoDB 构造用户的 RAG 文档。

    当前做法：
    - tasks/modules 各生成一条或多条文本
    - 作为向量库检索的上下文来源
    """

    # RAG 文档的来源完全来自 Mongo：这样“模型上下文”可控且可追溯，不依赖前端传来的不可信数据
    # get_db_checked 会在 Mongo 未就绪时抛出 MongoNotReadyError（由上层统一转成 ApiError）
    db = await get_db_checked()
    user_oid = None
    try:
        from bson import ObjectId

        # userId 在 Mongo 中通常是 ObjectId；这里做一次兼容转换，避免历史数据导致检索构建失败
        user_oid = ObjectId(user_id)
    except Exception:
        # 若转换失败，则按字符串兜底（用于兼容历史数据/测试数据）
        user_oid = user_id

    tasks = await db.tasks.find({"userId": user_oid}).to_list(length=None)
    modules = await db.modules.find({"userId": user_oid}).to_list(length=None)

    docs: list[dict[str, Any]] = []
    for m in modules:
        docs.append(
            {
                # id 用于向量库中做幂等写入：同一个模块重复 add 时会覆盖或跳过
                "id": f"module:{oid_str(m.get('_id'))}",
                "text": f"Module: {m.get('name','')}\nDescription: {m.get('description','')}",
                "metadata": {"type": "module", "moduleId": oid_str(m.get("_id"))},
            }
        )
    for t in tasks:
        docs.append(
            {
                # 对任务：把常用字段拼成一段可读文本，方便语义检索命中
                "id": f"task:{oid_str(t.get('_id'))}",
                "text": "\n".join(
                    [
                        f"Task: {t.get('title','')}",
                        f"Status: {t.get('status','')}",
                        f"Priority: {t.get('priority','')}",
                        f"ModuleName: {t.get('moduleName','')}",
                        f"Description: {t.get('description','')}",
                    ]
                ),
                "metadata": {
                    "type": "task",
                    "taskId": oid_str(t.get("_id")),
                    "status": t.get("status"),
                    "priority": t.get("priority"),
                },
            }
        )

    return docs


def _create_embeddings(settings):
    from langchain_openai import OpenAIEmbeddings

    emb_kwargs: dict[str, Any] = {
        "api_key": settings.OPENAI_API_KEY or "ollama",
        "timeout": 30,
        "max_retries": 2,
    }
    if getattr(settings, "OPENAI_BASE_URL", None):
        emb_kwargs["base_url"] = settings.OPENAI_BASE_URL
    if getattr(settings, "OPENAI_EMBED_MODEL", None):
        emb_kwargs["model"] = settings.OPENAI_EMBED_MODEL
    elif settings.OPENAI_API_KEY and not getattr(settings, "OPENAI_BASE_URL", None):
        emb_kwargs["model"] = "text-embedding-3-small"

    try:
        return OpenAIEmbeddings(**emb_kwargs)
    except TypeError:
        emb_kwargs.pop("base_url", None)
        try:
            return OpenAIEmbeddings(**emb_kwargs)
        except TypeError:
            emb_kwargs.pop("timeout", None)
            emb_kwargs.pop("max_retries", None)
            try:
                return OpenAIEmbeddings(**emb_kwargs)
            except TypeError:
                emb_kwargs.pop("model", None)
                return OpenAIEmbeddings(**emb_kwargs)


async def get_user_retriever(user_id: str):
    """为指定用户获取检索器（Retriever）。

    - 未配置 OPENAI_API_KEY：返回 None（AI/RAG 功能不可用，但不影响其他业务接口）
    - 使用本地 Chroma 作为向量库持久化（由 CHROMA_PERSIST_DIR 指定）
    """

    settings = get_settings()
    if not settings.OPENAI_API_KEY and not getattr(settings, "OPENAI_BASE_URL", None):
        # embeddings/LLM 都不可用时，直接禁用 RAG（保留基础对话与工具能力）
        return None

    # OpenAIEmbeddings：把文本转为向量；Chroma：本地向量库（可持久化到目录）
    from langchain_community.vectorstores import Chroma

    try:
        embeddings = _create_embeddings(settings)
    except Exception:
        return None

    collection_name = f"studyflow_{user_id}"
    vectorstore = Chroma(
        collection_name=collection_name,
        persist_directory=settings.CHROMA_PERSIST_DIR,
        embedding_function=embeddings,
    )

    docs = await build_user_documents(user_id)
    if docs:
        texts = [d["text"] for d in docs]
        metadatas = [d["metadata"] for d in docs]
        ids = [d["id"] for d in docs]
        try:
            # add_texts 可能因为已存在相同 id、或 Chroma 状态异常而报错。
            # 这里选择“尽量不影响对话主流程”：失败则继续使用现有向量库内容。
            vectorstore.add_texts(texts=texts, metadatas=metadatas, ids=ids)
        except Exception:
            pass
    # k 取 6：太少会漏掉相关上下文，太多会把无关内容塞进 prompt，反而影响回答质量
    # as_retriever：返回一个 Retriever 对象，后续可用 query 检索最相关的 k 条文本片段
    return vectorstore.as_retriever(search_kwargs={"k": 6})
