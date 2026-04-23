# StudyFlow (Productivity Management Project)

StudyFlow is a student-oriented learning efficiency management demo, centered around a task board (Kanban), complemented by timing and analytics features.

## Current Implemented Features (Based on Repository Code)

### Backend (`backend/`, FastAPI + MongoDB/motor)

* ✅ Health Check: `GET /api/health`
* ✅ Authentication: `POST /api/auth/register`, `POST /api/auth/login` (bcrypt hashing, JWT issuance)
* ✅ Tasks: `GET/POST /api/tasks`, `GET/PUT/DELETE /api/tasks/:id`, `PATCH /api/tasks/:id/status`, `POST /api/tasks/:id/subtask`
* ✅ Modules: `GET/POST /api/modules`, `PUT/DELETE /api/modules/:id`
* ✅ Timer: `POST /api/timer/start`, `POST /api/timer/stop`, `GET /api/timer/logs/:taskId`, `GET /api/timer/weekly-stats/:userId`
* ✅ Stats: `GET /api/stats/summary?range=day|week|month`
* ✅ Data Models: User / Task / Module / TimerLog
* ✅ Supports `MOCK_MODE=true`: backend runs in-memory mock routes without connecting to MongoDB (minimal viable API)

---

### Frontend (`frontend/`, React + Vite)

* ✅ Pages & Routing: `/` (Home), `/auth` (Login/Register), `/dashboard`, `/stats`, `/tasks`, `/focus`, `/settings`
* ✅ Dashboard: 4-state task board (To Do / In Progress / Review / Done), supports click-to-cycle task status (demo interaction)
* ✅ Tasks: task table (Add/Edit/Delete demo)
* ✅ Focus: 25-minute countdown timer + pause/resume/cancel (demo interaction)
* ✅ Settings: page skeleton (placeholder buttons)
* ✅ Health Check Indicator: frontend probes `/api/health` to detect backend availability

---

### Infrastructure

* ✅ `docker-compose.yml`: orchestrates MongoDB + Backend + Frontend (Nginx)
* ✅ `frontend/nginx.conf`: proxies `/api/` requests to `backend:8000`

---

## Local Development

### Option 1: One-command dev (Recommended)

```bash
cd /path/to/StudyFlow
./dev-up.sh --real
```

Access:

| Service      | URL                                                                  |
| ------------ | -------------------------------------------------------------------- |
| Frontend     | [http://localhost:5173](http://localhost:5173)                       |
| Backend API  | [http://localhost:8000/api](http://localhost:8000/api)               |
| Health Check | [http://localhost:8000/api/health](http://localhost:8000/api/health) |
| MongoDB      | mongodb://localhost:27017/studyflow                                  |

Stop:

```bash
Ctrl+C
```

---

### Option 2: Local Development (Without Docker)

#### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Environment variables example: see root `.env.example` (Docker Compose reads root `.env`).

---

#### Frontend

```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

For local development, Vite is configured in `frontend/vite.config.js` to proxy `/api` to `http://127.0.0.1:8000`.

---

## Documentation

* Requirements / Database / Structure: `docs/`
* API Examples: `API_EXAMPLES.md`
* Change Logs (aggregated from `external_files/`): `doc/update-record.md`

---

## Notes (Legacy)
The main workflow is based on `frontend/` + `backend/` + `docker-compose.yml`.
