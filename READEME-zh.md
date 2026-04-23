# StudyFlow（效率管理项目）

StudyFlow 是一个面向学生的学习效率管理 Demo，以任务看板（Kanban）为核心，并配套计时（Timer）与统计分析（analytics）功能。

## 当前已实现功能（以仓库代码为准）

### 后端（`backend/`，FastAPI + MongoDB/motor）

* ✅ 健康检查（Health Check）：`GET /api/health`
* ✅ 认证（Authentication）：`POST /api/auth/register`、`POST /api/auth/login`（bcrypt 哈希、JWT 签发）
* ✅ 任务（Tasks）：`GET/POST /api/tasks`、`GET/PUT/DELETE /api/tasks/:id`、`PATCH /api/tasks/:id/status`、`POST /api/tasks/:id/subtask`
* ✅ 模块（Modules）：`GET/POST /api/modules`、`PUT/DELETE /api/modules/:id`
* ✅ 计时（Timer）：`POST /api/timer/start`、`POST /api/timer/stop`、`GET /api/timer/logs/:taskId`、`GET /api/timer/weekly-stats/:userId`
* ✅ 统计（Stats）：`GET /api/stats/summary?range=day|week|month`
* ✅ 数据模型（Data Models）：User / Task / Module / TimerLog
* ✅ 支持 `MOCK_MODE=true`：后端使用内存 mock 路由，无需连接 MongoDB（最小可用 API）

---

### 前端（`frontend/`，React + Vite）

* ✅ 页面与路由（Pages & Routing）：`/`（首页 Home）、`/auth`（登录/注册）、`/dashboard`、`/stats`、`/tasks`、`/focus`、`/settings`
* ✅ Dashboard：四状态任务看板（To Do / In Progress / Review / Done），支持点击任务循环切换状态（演示交互）
* ✅ Tasks：任务列表表格（Add/Edit/Delete 演示）
* ✅ Focus：25 分钟倒计时 + 暂停/继续/取消（演示交互）
* ✅ Settings：设置页面骨架（占位按钮）
* ✅ 健康检查提示：前端会请求 `/api/health` 以检测后端是否可用

---

### 基础设施（Infrastructure）

* ✅ `docker-compose.yml`：编排 MongoDB + Backend + Frontend（Nginx）
* ✅ `frontend/nginx.conf`：将 `/api/` 请求反向代理（reverse proxy）到 `backend:8000`

---

## 本地开发（Local Development）

### 方式 1：一键联调（推荐）

```bash
cd /path/to/StudyFlow
./dev-up.sh --real
```

访问：

| 服务                  | 地址                                                                   |
| ------------------- | -------------------------------------------------------------------- |
| 前端（Frontend）        | [http://localhost:5173](http://localhost:5173)                       |
| 后端 API（Backend API） | [http://localhost:8000/api](http://localhost:8000/api)               |
| 健康检查（Health Check）  | [http://localhost:8000/api/health](http://localhost:8000/api/health) |
| MongoDB             | mongodb://localhost:27017/studyflow                                  |

停止：

```bash
Ctrl+C
```

---

### 方式 2：本地开发（不使用 Docker）

#### 后端（Backend）

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

环境变量示例：见根目录 `.env.example`（Docker Compose 会读取根目录 `.env`）。

---

#### 前端（Frontend）

```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

在本地开发中，Vite 已在 `frontend/vite.config.js` 中配置，将 `/api` 代理到 `http://127.0.0.1:8000`。

---

## 文档（Documentation）

* 需求 / 数据库 / 结构说明：`docs/`
* API 示例：`API_EXAMPLES.md`
* 修改记录（汇总自 `external_files/`）：`doc/update-record.md`

---

## 备注（历史遗留）
当前主流程基于 `frontend/` + `backend/` + `docker-compose.yml`。
