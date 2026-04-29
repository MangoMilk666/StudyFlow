# StudyFlow

## 项目简介

StudyFlow 是一个面向学生的效率管理应用。以看板式任务管理为核心，集成番茄钟专注计时、统计分析、基于 RAG（检索增强生成）的 AI 助手，以及 Canvas LMS 课程导入功能，为学生提供一个统一的学习工作台。目标是让学生在不切换多个工具的前提下，完整掌握自己的学习负载、时间投入和进度情况。

## 产品定位

StudyFlow 是一个自托管的全栈 Web 应用，适合小团队或个人部署使用，并非 SaaS 产品。所有数据保留在部署环境内，用户可选择接入自己的 OpenAI API Key 和 Canvas 访问 Token。

---

## 架构与技术栈

### 前端

| 项目 | 选型 |
|---|---|
| 框架 | React 18（函数组件 + Hooks） |
| 构建工具 | Vite |
| 路由 | React Router v6 |
| HTTP 客户端 | Axios |
| 图表 | Recharts |
| 语言切换 | 内置 i18n（英文 / 中文） |
| 生产环境服务 | Nginx（Docker 容器内） |

`frontend/src/` 下的关键目录：

- `auth/` - 认证上下文和 Session 状态管理
- `components/` - 共享 UI 组件（TopNav、TaskModal、ChatModal、CanvasImportModal、AIFab、SettingsFab）
- `hooks/` - 自定义 React Hooks
- `i18n/` - 翻译字符串
- `pages/` - 完整页面视图（见功能模块章节）
- `services/` - Axios API 封装（`api.js`）
- `utils/` - 工具函数（如 `device.js`，用于持久化设备指纹）

### 后端

| 项目 | 选型 |
|---|---|
| 框架 | FastAPI（异步，Python 3.11+） |
| ASGI 服务器 | Uvicorn |
| 数据库驱动 | Motor（MongoDB 异步驱动） |
| 认证 | JWT（python-jose）、bcrypt 密码哈希（passlib） |
| AI 流水线 | LangChain + LangChain-OpenAI |
| 大语言模型 | OpenAI API（默认模型：gpt-4.1-mini） |
| 向量存储 | ChromaDB（本地持久化 RAG 索引） |
| Canvas 集成 | Canvas REST API（通过 httpx） |
| 敏感数据 | 字段级加密存储用户 API Key（自定义 crypto 服务） |

`backend/app/` 下的源码布局：

- `main.py` - 应用入口，路由注册，CORS 配置
- `config.py` - Pydantic 配置（读取环境变量）
- `deps.py` - FastAPI 依赖注入（JWT 校验、Session 验证）
- `errors.py` - 统一 API 错误模型
- `models/` - Pydantic 请求/响应模型
- `routers/` - 每个 API 领域一个文件（`auth`、`user`、`tasks`、`modules`、`timer`、`stats`、`ai`、`canvas`、`mock`）
- `services/` - 基础设施服务（`db`、`security`、`crypto`、`rag`、`canvas_client`、`user_ai_config`）

### 数据库

项目使用 MongoDB 作为唯一数据库，集合说明如下：

| 集合 | 用途 |
|---|---|
| `users` | 账号凭据与用户信息 |
| `sessions` | 活跃登录会话，含持久化设备指纹 |
| `tasks` | 任务记录（含子任务与状态） |
| `modules` | 用户自定义模块（带颜色标签的分类） |
| `timer_logs` | 每个任务的番茄钟计时记录 |
| `user_ai_configs` | 每用户 AI 配置（个人 API Key 字段级加密存储） |

### 基础设施与工具

| 项目 | 用途 |
|---|---|
| Docker Compose | 编排后端容器与前端（Nginx）容器 |
| Nginx | 服务构建后的 React SPA，并将 `/api/` 反向代理至后端 |
| `dev-up.sh` | 一键启动本地开发环境的 Shell 脚本 |
| ChromaDB volume | 命名 Docker 卷（`chroma-data`），跨重启持久化 RAG 向量索引 |

---

## 功能模块

### 认证与会话管理

- 邮箱/密码注册与登录，bcrypt 哈希，JWT 签发。
- 按设备追踪会话：每次登录记录一条 Session 文档，包含稳定 UUID 设备指纹（`persistentId`）、设备名称、User Agent 和 IP。
- 去重逻辑：同一设备重新登录时复用已有 Session，不创建重复记录。
- 设备管理 UI：用户可查看所有活跃 Session，并远程注销指定设备。
- 退出登录时同时吊销后端 Session，而不仅仅是清除客户端 Token。

### 仪表盘（Dashboard）

- 四列看板：待办（To Do）、进行中（In Progress）、审核中（Review）、已完成（Done）。
- 点击任务卡片可循环切换状态。
- 任务卡片显示模块颜色标签。

### 任务管理（Tasks）

- 任务完整 CRUD：创建、编辑、删除、状态更新。
- 支持每个任务添加子任务。
- 按模块、状态和截止日期筛选与排序。
- 任务详情弹窗展示所有元数据。

### 专注计时（Focus）

- 每个任务配备 25 分钟倒计时，支持暂停、继续和取消。
- 计时状态持久化，离开页面后再次进入可恢复当前进度。
- 计时完成后向后端写入计时日志，用于统计分析。

### 数据统计（Stats）

- 按日、周、月维度汇总时间投入图表。
- 每个任务的专注时间总计明细。
- 使用 Recharts 渲染柱状图和折线图。

### AI 助手

- 悬浮聊天界面，底层使用 LangChain 和 OpenAI。
- RAG 流水线：任务和模块数据被索引到本地 ChromaDB 向量库，AI 在回答前检索相关上下文。
- 用户可在设置页配置自己的 OpenAI API Key 和模型，Key 以字段级加密形式存入 MongoDB。

### Canvas LMS 集成

- 在设置页填入 Canvas 个人访问 Token。
- 可预览、导入、同步已选课程中的 Canvas 作业，直接生成任务看板条目。

### 设置（Settings）

- 个人信息：查看用户名/邮箱、修改邮箱。
- 模块管理：创建、重命名、换色、删除自定义模块。
- AI 配置：切换个人 Key、设置模型名称、存储或清除 API Key。
- 数据共享协议：接受或撤回数据共享政策。
- 设备管理：查看活跃 Session 列表、注销远程设备。
- 语言：中英文切换。

---

## 目录结构

```
StudyFlow/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── deps.py
│   │   ├── errors.py
│   │   ├── models/
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   ├── task.py
│   │   │   ├── module.py
│   │   │   └── timer.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   ├── tasks.py
│   │   │   ├── modules.py
│   │   │   ├── timer.py
│   │   │   ├── stats.py
│   │   │   ├── ai.py
│   │   │   ├── canvas.py
│   │   │   └── mock.py
│   │   └── services/
│   │       ├── db.py
│   │       ├── security.py
│   │       ├── crypto.py
│   │       ├── rag.py
│   │       ├── canvas_client.py
│   │       └── user_ai_config.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── i18n/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── public/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── requirements.md
│   ├── database_schema.md
│   ├── PROJECT_STRUCTURE.md
│   └── update-record.md
├── docker-compose.yml
├── dev-up.sh
├── .env.example
├── .env.local.example
├── .env.prod.example
├── .gitignore
├── README.md
├── READEME-zh.md
└── API_EXAMPLES.md
```

---

## 配置文件说明

以下文件以 `.example` 后缀形式提交到仓库，作为模板使用。实际部署时请复制并去掉 `.example` 后缀，填入真实值后使用。切勿将含有真实密钥的文件提交到版本库。

### `.env.example`

面向生产部署的 Docker Compose 环境变量模板。变量说明：

- `CANVAS_BASE_URL` - Canvas LMS 实例的基础 URL（如 `https://school.instructure.com`）
- `CANVAS_TOKEN` - Canvas 个人访问 Token

Docker Compose 会自动读取根目录 `.env`。更完整的后端变量（MongoDB URI、JWT Secret、OpenAI Key 等）定义在 `.env.local.example` 中。

### `.env.local.example`

`dev-up.sh` 使用的本地开发完整变量参考。主要变量：

| 变量 | 用途 |
|---|---|
| `COMPOSE_PROJECT_NAME` | 固定 Docker 项目名，防止重复创建资源 |
| `MOCK_MODE` | 设为 `true` 时后端使用内存 Mock 数据，无需 MongoDB |
| `MONGO_URI` | MongoDB 连接串 |
| `JWT_SECRET` | JWT 签名密钥（生产环境请使用强随机值） |
| `CANVAS_BASE_URL` / `CANVAS_TOKEN` | Canvas LMS 凭据 |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | OpenAI 凭据，供 AI 助手使用 |
| `OPENAI_BASE_URL` | 可覆盖为兼容第三方 OpenAI 接口的地址 |
| `CHROMA_PERSIST_DIR` | ChromaDB 向量索引的本地存储目录 |
| `CORS_ORIGINS` | 允许跨域的前端来源（逗号分隔） |

### `.env.prod.example`

生产环境变量参考，结构与 `.env.local.example` 相同，面向 CI/CD 平台注入。`MONGO_URI` 指向生产 Atlas 集群或自托管实例，`JWT_SECRET` 应使用强随机值。

### `backend/.env.example`

不使用 Docker Compose、直接运行后端时的环境变量参考。

### `frontend/.env.example`

前端构建时变量：

- `VITE_API_BASE_URL` - Axios 发起 API 请求的基础 URL（通过 Nginx 代理时默认为 `/api`；单独运行前端时设置为完整的后端地址）

### `docker-compose.yml`

定义两个服务：

- `backend` - 从 `backend/Dockerfile` 构建，对外暴露 8000 端口，挂载命名卷持久化 ChromaDB 数据，从根目录 `.env` 读取环境变量。
- `frontend` - 从 `frontend/Dockerfile` 构建（Vite 生产构建，由 Nginx 服务），对外暴露 5173 端口，依赖 backend 服务。

两个容器共享一个 bridge 网络（`studyflow-network`），前端 Nginx 容器可以通过服务名将 `/api/` 请求代理到后端容器。

### `frontend/nginx.conf`

生产前端容器的 Nginx 配置：

- 从 `/usr/share/nginx/html` 服务构建好的 React SPA，使用 `try_files` 回退到 `index.html`，支持客户端路由。
- 将所有 `/api/` 请求代理到 `http://backend:8000`。

### `dev-up.sh`

本地开发便捷脚本，接受 `--mock`（以 Mock 模式启动后端，无需 MongoDB）或 `--real`（以真实 MongoDB 连接启动后端）参数，并使用对应的环境覆盖文件执行 Docker Compose。

---

## 补充文档

| 文件 | 内容 |
|---|---|
| `API_EXAMPLES.md` | 所有接口的 curl 调用示例 |
| `docs/requirements.md` | 功能性与非功能性需求说明 |
| `docs/database_schema.md` | MongoDB 集合 Schema 定义 |
| `docs/PROJECT_STRUCTURE.md` | 项目目录结构详细说明 |
| `docs/update-record.md` | 汇总变更记录 |
