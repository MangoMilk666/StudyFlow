# StudyFlow（效率管理项目）

StudyFlow 是一个面向学生的学习效率管理 Demo：以任务看板（Kanban）为核心，配套计时与统计能力。

## 当前已实现功能清单（以仓库代码为准）

### 后端（`backend/`，Express + MongoDB/Mongoose）

- ✅ 健康检查：`GET /api/health`
- ✅ 认证：`POST /api/auth/register`、`POST /api/auth/login`（bcrypt 哈希、JWT 签发）
- ✅ 任务 Tasks：`GET/POST /api/tasks`、`GET/PUT/DELETE /api/tasks/:id`、`PATCH /api/tasks/:id/status`、`POST /api/tasks/:id/subtask`
- ✅ 模块 Modules：`GET/POST /api/modules`、`PUT/DELETE /api/modules/:id`
- ✅ 计时 Timer：`POST /api/timer/start`、`POST /api/timer/stop`、`GET /api/timer/logs/:taskId`、`GET /api/timer/weekly-stats/:userId`
- ✅ 数据模型：User/Task/Module/TimerLog
- ✅ 支持 `MOCK_MODE=true`：后端不连 MongoDB，走内存 mock 路由（最小可用 API）

重要说明：当前后端未实现 JWT 校验中间件（未对 `Authorization: Bearer ...` 做 `jwt.verify`）；业务接口主要以 `userId` 字段/查询参数做筛选。

### 前端（`frontend/`，React + Vite）

- ✅ 页面与路由：`/`（Home）、`/auth`（登录/注册演示）、`/dashboard`、`/tasks`、`/focus`、`/settings`
- ✅ Dashboard：4 状态任务面板（To Do / In Progress / Review / Done），支持点击任务循环切换状态（演示交互）
- ✅ Tasks：任务列表表格（Add/Edit/Delete 演示）
- ✅ Focus：25 分钟倒计时 + 暂停/继续/取消（演示交互）
- ✅ Settings：设置页面骨架（按钮占位）
- ✅ 健康检查提示：前端会探测 `/api/health` 判断后端是否可达

重要说明：当前前端的“登录状态/任务数据”默认使用 `localStorage` 的 demo 数据；仓库内已提供 `frontend/src/services/api.js` 的 Axios API 封装，但尚未完全接入页面逻辑（例如 token key 与 `useAuth` 存储不一致）。

### 基础设施

- ✅ `docker-compose.yml`：编排 MongoDB + Backend + Frontend(Nginx)
- ✅ `frontend/nginx.conf`：将 `/api/` 反代到 `backend:8000`

## 本地调试

### 方式 1：Docker Compose（推荐）

```bash
cd /path/to/StudyFlow
docker-compose up -d --build
docker-compose ps
docker-compose logs -f
```

访问：

| 服务 | URL |
|------|-----|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:8000/api |
| 健康检查 | http://localhost:8000/api/health |
| MongoDB | mongodb://localhost:27017/studyflow |

停止：

```bash
docker-compose down
docker-compose down -v
```

### 方式 2：本地开发（不使用 Docker）

#### 后端

```bash
cd backend
npm install

# 方式 A：连接本地 MongoDB
npm start  # http://localhost:8000

# 方式 B：MOCK 模式（不依赖 MongoDB）
npm run dev:mock  # http://localhost:8000
```

后端环境变量示例见 `backend/.env.example`。

#### 前端

```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

本地开发时，Vite 已在 `frontend/vite.config.js` 配置 `/api` 代理到 `http://127.0.0.1:8000`。

## 文档

- 需求/数据库/结构说明：`docs/`
- API 示例：`API_EXAMPLES.md`
- 历次修改记录（已从 `external_files/` 汇总）：`doc/update-record.md`

## 备注（历史遗留）

根目录的 `server/` 与 `public/`、`src/` 是早期静态页面/编译产物相关代码；当前主流程以 `frontend/` + `backend/` + `docker-compose.yml` 为准。
