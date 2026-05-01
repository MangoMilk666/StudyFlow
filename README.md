# StudyFlow

Project Statement (PDF): [docs/Project_Statement.pdf](docs/Project_Statement.pdf)

## Acknowledgements
This project is an evolution of a **group project** developed for the IT5007 course at NUS. 
- Original Team Members: Sang Ziheng, Wu Kaifan, Tong Yicheng
- My Role: Lead developer responsible for backend service
- Purpose: This repository serves as a personal sandbox for further refinement, refactoring, and integration of new features beyond the scope of the original course project.
## Overview

StudyFlow is a student-oriented productivity management application. It centers on a Kanban-style task board and combines Pomodoro focus timers, statistical analysis, an AI assistant powered by RAG (Retrieval-Augmented Generation), and Canvas LMS integration into a single unified workspace. The goal is to give students a coherent view of their study workload, time investment, and progress without switching between multiple tools.

## Positioning

StudyFlow is designed as a self-hosted, full-stack web application suited for small teams or individual use. It is not a SaaS product. All data stays within the deployment environment, and users can optionally connect their own OpenAI API key and Canvas access token.

---

## Architecture and Technology Stack

### Frontend

| Item | Choice |
|---|---|
| Framework | React 18 (functional components, hooks) |
| Build tool | Vite |
| Routing | React Router v6 |
| HTTP client | Axios |
| Charts | Recharts |
| Language toggle | Built-in i18n (English / Chinese) |
| Serving (production) | Nginx (inside Docker) |

Key source directories under `frontend/src/`:

- `auth/` - authentication context and session state
- `components/` - shared UI components (TopNav, TaskModal, ChatModal, CanvasImportModal, AIFab, SettingsFab)
- `hooks/` - custom React hooks
- `i18n/` - translation strings
- `pages/` - full-page views (see Feature Modules below)
- `services/` - Axios API wrappers (`api.js`)
- `utils/` - utility functions (e.g., `device.js` for persistent device fingerprinting)

### Backend

| Item | Choice |
|---|---|
| Framework | FastAPI (async, Python 3.11+) |
| ASGI server | Uvicorn |
| Database driver | Motor (async MongoDB driver) |
| Authentication | JWT (python-jose), bcrypt password hashing (passlib) |
| AI pipeline | LangChain + LangChain-OpenAI |
| LLM | OpenAI API (default model: gpt-4.1-mini) |
| Vector store | ChromaDB (local persistent RAG index) |
| Canvas integration | Canvas REST API via httpx |
| Sensitive data | Field-level encryption for stored API keys (custom crypto service) |

Backend source layout under `backend/app/`:

- `main.py` - application entry point, router registration, CORS
- `config.py` - Pydantic settings (reads environment variables)
- `deps.py` - FastAPI dependency injection (JWT verification, session validation)
- `errors.py` - unified API error model
- `models/` - Pydantic request/response models
- `routers/` - one file per API domain (`auth`, `user`, `tasks`, `modules`, `timer`, `stats`, `ai`, `canvas`, `mock`)
- `services/` - infrastructure services (`db`, `security`, `crypto`, `rag`, `canvas_client`, `user_ai_config`)

### Database

MongoDB is used as the sole database. Collections:

| Collection | Purpose |
|---|---|
| `users` | Account credentials and profile |
| `sessions` | Active login sessions with persistent device fingerprinting |
| `tasks` | Task records with subtasks and status |
| `modules` | User-defined modules (color-coded categories) |
| `timer_logs` | Per-task Pomodoro timer records |
| `user_ai_configs` | Per-user AI settings (personal API key stored encrypted) |

### Infrastructure and Tooling

| Item | Purpose |
|---|---|
| Docker Compose | Orchestrates backend container and frontend (Nginx) container |
| Nginx | Serves the built React SPA and reverse-proxies `/api/` to the backend |
| `dev-up.sh` | Shell script for one-command local development startup |
| ChromaDB volume | Named Docker volume (`chroma-data`) persists the RAG vector index across restarts |

---

## Feature Modules

### Authentication and Session Management

- Email/password registration and login with bcrypt hashing and JWT issuance.
- Per-device session tracking: each login records a session document containing a stable UUID device fingerprint (`persistentId`), device name, user agent, and IP address.
- Deduplication: re-login from the same device reuses the existing session rather than creating a new record.
- Device management UI: users can view all active sessions and remotely sign out individual devices.
- Logout revokes the backend session in addition to clearing the client token.

### Dashboard

- Kanban board with four columns: To Do, In Progress, Review, Done.
- Click a task to cycle its status forward.
- Module color indicators per task card.

### Tasks

- Full CRUD for tasks: create, edit, delete, update status.
- Subtask support within each task.
- Filter and sort by module, status, and due date.
- Task detail modal with all metadata.

### Focus (Pomodoro Timer)

- 25-minute countdown timer per task with pause, resume, and cancel controls.
- Timer state is persisted so navigating away and returning restores the active session.
- On completion, a timer log entry is written to the backend for statistical tracking.

### Stats

- Summary charts for daily, weekly, and monthly time investment.
- Per-task breakdown of total focused time.
- Rendered with Recharts bar and line charts.

### AI Assistant

- Floating chat interface powered by LangChain and OpenAI.
- RAG pipeline: task and module data is indexed in a local ChromaDB vector store; the assistant retrieves relevant context before answering.
- Users can configure their own OpenAI API key and model in Settings; the key is stored field-encrypted in MongoDB.

### Canvas LMS Integration

- Connect a Canvas personal access token in Settings.
- Preview, import, and sync assignments from enrolled Canvas courses directly into the task board.

### Settings

- Profile: view username/email, change email address.
- Modules: create, rename, recolor, and delete modules.
- AI configuration: toggle personal key usage, set model name, store or clear API key.
- Data sharing consent: accept or withdraw the data-sharing policy.
- Device management: list active sessions, sign out remote sessions.
- Language: toggle between English and Chinese.

---

## Configuration Files

The following files are committed to the repository as templates. Copy and rename them (removing `.example`) to create your actual configuration. Never commit files containing real secrets.

### `.env.example`

Docker Compose environment template for production-style deployments. Variables:

- `CANVAS_BASE_URL` - base URL of your Canvas LMS instance (e.g., `https://school.instructure.com`)
- `CANVAS_TOKEN` - Canvas personal access token

Docker Compose reads the root `.env` automatically. Additional backend variables (MongoDB URI, JWT secret, OpenAI key, etc.) are defined in `.env.local.example`.

### `.env.local.example`

Full local development variable reference used by `dev-up.sh`. Key variables:

| Variable | Purpose |
|---|---|
| `COMPOSE_PROJECT_NAME` | Fixes Docker project name to prevent duplicate resources |
| `MOCK_MODE` | Set `true` to run the backend with in-memory mock data (no MongoDB required) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWTs (use a strong random value in production) |
| `CANVAS_BASE_URL` / `CANVAS_TOKEN` | Canvas LMS credentials |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | OpenAI credentials for the AI assistant |
| `OPENAI_BASE_URL` | Override for compatible third-party OpenAI endpoints |
| `CHROMA_PERSIST_DIR` | Local directory for the ChromaDB vector index |
| `CORS_ORIGINS` | Allowed frontend origins for CORS |

### `.env.prod.example`

Production variable reference. Structure mirrors `.env.local.example` but intended for deployment platforms (CI/CD environment injection). Contains a `MONGO_URI` pointing to a production Atlas cluster or self-hosted instance, and a strong `JWT_SECRET`.

### `docker-compose.yml`

Defines two services:

- `backend` - builds from `backend/Dockerfile`, exposes port 8000, mounts a named volume for ChromaDB persistence, and reads environment variables from the root `.env`.
- `frontend` - builds from `frontend/Dockerfile` (Vite production build served by Nginx), exposes port 5173, and depends on the backend service.

A shared bridge network (`studyflow-network`) allows the frontend Nginx container to proxy `/api/` requests to the backend container by service name.

### `frontend/nginx.conf`

Nginx configuration for the production frontend container:

- Serves the built React SPA from `/usr/share/nginx/html` with `try_files` fallback to `index.html` (supports client-side routing).
- Proxies all requests under `/api/` to `http://backend:8000`.

### `dev-up.sh`

Convenience script for local development. Accepts `--mock` (starts backend in mock mode, no MongoDB needed) or `--real` (starts backend with a real MongoDB connection). Runs Docker Compose with the appropriate environment overlay.

---

## Additional Documentation

| File | Contents |
|---|---|
| `API_EXAMPLES.md` | curl-based API usage examples for all endpoints |
| `docs/requirements.md` | Functional and non-functional requirements |
| `docs/database_schema.md` | MongoDB collection schemas |
| `docs/PROJECT_STRUCTURE.md` | Detailed project layout notes |
| `docs/update-record.md` | Aggregated change log |
