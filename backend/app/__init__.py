"""StudyFlow 后端应用包（app）。

目录结构（常见 FastAPI 分层）：
- main.py：应用入口（挂载路由、中间件、生命周期）
- routers/：HTTP API 路由
- models/：Pydantic 模型（请求/响应结构）
- services/：业务服务（DB/JWT/RAG/Canvas 等）
- utils/：通用工具函数
"""
