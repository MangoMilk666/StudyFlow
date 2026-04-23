from __future__ import annotations

from typing import Any

from app.config import get_settings
from app.services.db import MongoNotReadyError, get_db_checked
from app.utils.mongo import oid_str


async def build_user_documents(user_id: str) -> list[dict[str, Any]]:
    """从 MongoDB 构造用户的 RAG 文档。

    当前做法：
    - tasks/modules 各生成一条或多条文本
    - 作为向量库检索的上下文来源
    """

    db = await get_db_checked()
    user_oid = None
    try:
        from bson import ObjectId

        user_oid = ObjectId(user_id)
    except Exception:
        user_oid = user_id

    tasks = await db.tasks.find({"userId": user_oid}).to_list(length=None)
    modules = await db.modules.find({"userId": user_oid}).to_list(length=None)

    docs: list[dict[str, Any]] = []
    for m in modules:
        docs.append(
            {
                "id": f"module:{oid_str(m.get('_id'))}",
                "text": f"Module: {m.get('name','')}\nDescription: {m.get('description','')}",
                "metadata": {"type": "module", "moduleId": oid_str(m.get("_id"))},
            }
        )
    for t in tasks:
        docs.append(
            {
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


async def get_user_retriever(user_id: str):
    """为指定用户获取检索器（Retriever）。

    - 未配置 OPENAI_API_KEY：返回 None（AI/RAG 功能不可用，但不影响其他业务接口）
    - 使用本地 Chroma 作为向量库持久化（由 CHROMA_PERSIST_DIR 指定）
    """

    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        return None

    from langchain_openai import OpenAIEmbeddings
    from langchain_community.vectorstores import Chroma

    embeddings = OpenAIEmbeddings(api_key=settings.OPENAI_API_KEY)
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
            vectorstore.add_texts(texts=texts, metadatas=metadatas, ids=ids)
        except Exception:
            pass

    return vectorstore.as_retriever(search_kwargs={"k": 6})
