# IT5007 Group Project

## 🚀 快速启动指南

### 前置条件
- Docker & Docker Compose 已安装
- 端口 27017 (MongoDB)、8000 (Backend)、5173 (Frontend) 可用

### 启动应用

```bash
cd /path/to/StudyFlow

# 启动所有服务（后台）
docker-compose up -d

# 查看容器状态
docker ps

# 查看实时日志
docker-compose logs -f
```

### 访问应用

| 服务 | URL | 用途 |
|------|-----|------|
| **前端** | http://localhost:5173 | React Web 界面，登录即可开始|
| **后端 API** | http://localhost:8000/api | REST API 服务 |
| **数据库** | localhost:27017 | MongoDB 数据库服务 |

### 停止应用

```bash
docker-compose down        # 停止所有服务
docker-compose down -v     # 停止服务并删除数据卷
```

### 本地开发（无 Docker）

```bash
# 后端启动
cd backend
npm install

# 方式 A：直接连 MongoDB（需要本地已启动 MongoDB）
npm start                # 运行在 http://localhost:8000

# 方式 B：Mock 模式（不依赖 MongoDB，提供最小可用占位 API）
npm run dev:mock         # 运行在 http://localhost:8000

# 前端启动（新终端）
cd frontend
npm install
npm run dev              # 运行在 http://localhost:5173
```

文档同步位置：
- 重构 PRD / 技术架构 / 页面设计：`docs/refactor/`

---

## Requirement (PPT)

>  Requirement: To build a fully functional website. No need to host it on cloud. We will be testing it in our docker-based setup.

# Project: **StudyFlow**

**Positioning:** A learning task management platform designed for students, based on kanban boards and task flows.

------

## 1. Core Highlights

- **Task Priority System:** Introduces the “Four Quadrant Method” (Important/Urgent) to help students schedule tasks scientifically.
- **Pomodoro Timer Integration:** Not only records tasks but also allows users to start focus timers directly within the web interface.
- **Docker Automated Deployment:** Database and backend services can be launched with one command, ensuring seamless execution in the teaching assistant’s environment.

------

## 2. Technology Stack

To ensure development stability, the following classic stack is recommended:

- **Frontend:** **React.js** + **Material UI (MUI)**.
  - *Reason:* MUI provides very mature dashboard components (such as progress bars and calendars), allowing rapid development of a polished “study assistant” interface.
- **Backend:** **Node.js (Express)**.
  - *Reason:* Extremely fast response for frequent task state updates (e.g., dragging tasks from “To Do” to “Done”).
- **Database:** **MongoDB** (or PostgreSQL).
  - *Reason:* Task descriptions (Notes) in study plans often vary in length; the flexibility of NoSQL is better suited for storing such unstructured text.
- **Containerization (DevOps):** **Docker** + **Docker Compose**.

------

## 3. Functional Modules

### A. Kanban (DashBoard) Board Module

- **State Flow:** Tasks are divided into `To Do`, `In Progress`, `Review`, and `Done`.
- **Drag-and-Drop Feature:** Implement visual drag-and-drop for tasks between different states.

### B. Task Details and Priority

- **Attribute Definition:** Each task includes a title, deadline, associated subjects, and priority (High/Medium/Low).
- **Subtask Checklist:** Large tasks (e.g., Assignment 1) can be broken down into multiple smaller steps.

### C. Focus Mode and Statistics

- **Pomodoro Timer:** A built-in web countdown timer that automatically updates the task’s “total time spent” after each focus session.
- **Weekly Report Statistics:** Automatically generates a bar chart showing the number of tasks completed during the week, illustrating learning efficiency.
- **AI-Powered Insights**: Integrated with **LLM APIs** to analyze historical learning patterns. By examining data such as peak focus hours and common procrastination points, the AI generates personalized suggestions, such as "Allocate high-complexity tasks to morning hours" or "Increase focus on certain subjects to stay on track."

### D. Module Organizer

- **Course Classification:** Users can create different module categories (e.g., IT5007, CS5242) and assign different theme colors to each module.

------

## 4. System Architecture Diagram (Architecture)

![image-20260312134236731](./IT5007%20Project%20Initial%20Proposal.assets/image-20260312134236731.png)

## 5. Database Design Suggestions (Database Schema)

| **Entity**   | **Key Fields**                                    | **Notes**               |
| ------------ | ------------------------------------------------- | ----------------------- |
| **User**     | username, email, password                         | User account            |
| **Task**     | user_id, title, status, priority, ddl, time_spent | Core task data          |
| **Module**   | user_id, name, color_code                         | Course/project category |
| **TimerLog** | task_id, start_time, duration                     | Focus time records      |
