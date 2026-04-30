# Project Statement — StudyFlow

## 1. Problem Statement

Students typically manage coursework across multiple disconnected tools: a Learning Management System (e.g., Canvas) for assignments, a task app for planning, a focus timer for execution, and spreadsheets or dashboards for reflection. This fragmentation creates three practical problems:

- **Context switching and data inconsistency**: assignment deadlines live in the LMS, study plans live elsewhere, and time investment is rarely linked back to specific tasks.
- **Lack of feedback loops**: students can track “what to do” but not “how much time it took” and “what is trending up/down” in a way that informs future planning.
- **Access and privacy constraints**: many SaaS productivity tools require uploading personal study data to a third party, which is undesirable for some users and institutions.

### Novelty

StudyFlow is not “yet another todo list”. The novelty is the **integration of three loops in one self-hostable workspace**:

1) **Intake loop**: pull assignments from Canvas (courses → assignments).  
2) **Execution loop**: run Pomodoro sessions against a selected task and record structured logs.  
3) **Reflection loop**: show multi-dimensional analytics (time by module, top tasks by time, completion trend) and use an AI assistant that can read personal context via RAG.

### Challenges

- **Unifying data models**: tasks must support both manual creation and imported assignment sources (idempotency, updates, partial failures).
- **Time correctness**: user-facing timestamps must remain consistent across time zones, browsers, and MongoDB’s UTC storage.
- **Reliable async I/O**: the backend must handle concurrent I/O (MongoDB, Canvas API, AI providers) without blocking the event loop.
- **Security and governance**: store sensitive credentials (AI keys) securely; keep authentication robust across devices; keep the system usable for both local and deployed environments.

### Relevance in 2/5/10 years

- **2 years**: AI-assisted planning and retrieval becomes a baseline expectation; LMS integrations remain essential for academic workflows.
- **5 years**: privacy-aware and self-hostable alternatives gain relevance due to regulatory pressure and institutional policies.
- **10 years**: learning analytics and personalized study assistants become standard; an extensible, open architecture is valuable to adapt to changing models, providers, and LMS ecosystems.

## 2. Solution Architecture

StudyFlow is a **frontend–backend separated** web application.

### High-level components

- **Frontend (React + Vite)**: single-page application that manages UI state, calls backend APIs, and renders charts.
- **Backend (FastAPI + Motor)**: async API server providing authentication, task/module CRUD, timer logging, stats aggregation, Canvas integration, and AI endpoints.
- **Database (MongoDB)**: single persistent store for users, sessions, tasks, modules, timer logs, and per-user AI configuration.
- **AI Subsystem (LangChain/LangGraph + Chroma)**: tool-augmented chat endpoint with optional RAG retrieval over the user’s tasks/modules.

### Data flow overview

1) **Authentication**  
   - User logs in → backend issues JWT with a session id (`sid`) for device/session validation.
   - Frontend stores token locally and sends `Authorization: Bearer <token>` on API calls.

2) **Task & Module Management**  
   - Tasks and modules are stored in MongoDB and filtered by `userId`.
   - Tasks may reference a module via `module` (ObjectId) and also keep `moduleName` for convenience and display.

3) **Pomodoro / Focus**  
   - Focus page persists timer state in local storage to survive navigation.
   - Completed or interrupted sessions are written to backend timer logs, enabling statistics.

4) **Statistics**  
   - Backend aggregates time spent and trends (day/week/month) and serves summarized datasets.
   - Frontend visualizes them using bar/line/pie charts.

5) **Canvas Integration**  
   - Backend calls Canvas REST endpoints using `CANVAS_BASE_URL` and `CANVAS_TOKEN`.
   - Users can preview assignments and optionally sync/import to tasks, with idempotent “source-based” updates.

6) **AI Assistant**  
   - Single chat endpoint that can call tools to read stats, create tasks, and fetch Canvas assignments.
   - Optional RAG retrieval over tasks/modules via a local Chroma index.
   - Supports user-specific AI key/model overrides, stored encrypted.

### Key interfaces (selected)
- `/api/auth/*`: register/login/update email  
- `/api/user/*`: profile, devices, consent, AI configuration  
- `/api/tasks/*`, `/api/modules/*`: CRUD  
- `/api/timer/*`, `/api/stats/*`: timer logs and aggregations  
- `/api/canvas/*`: courses, preview/sync assignments  
- `/api/ai/chat`: tool-augmented assistant

## 3. Legal Aspects and Business Model

### Business model

StudyFlow is intended to be **open source** and **self-hosted**:
- No centralized SaaS backend is required.
- Users keep their own data in their deployment environment.
- Optional integrations (Canvas, AI providers) remain under user control.

### Use of open source code

The project is built on widely used open source ecosystems:
- **Frontend**: React, React Router, Axios, Recharts, Vite.
- **Backend**: FastAPI, Uvicorn, Motor, Pydantic, httpx.
- **Security**: python-jose (JWT), passlib/bcrypt (password hashing), cryptography (field-level encryption).
- **AI**: LangChain/LangGraph, ChromaDB.

### Open sourcing the project

Open sourcing requires:
- Clear license selection (e.g., MIT/Apache-2.0) and third-party attribution.
- Removing secrets from the repository (use `.env.local` and `.env` templates only).
- Documenting security expectations (e.g., enabling MongoDB auth in non-isolated deployments).

## 4. Competition Analysis

The space is competitive because task management and focus apps are commoditized. Competitors include:

- **General task managers** (strong UI, collaboration, integrations): Todoist, Notion, Trello, Asana, ClickUp, Microsoft To Do.
- **Student-specific planners**: MyStudyLife and similar academic planners.
- **Focus/Pomodoro apps**: Forest, Focus To-Do, Pomofocus.
- **LMS-native workflows**: Canvas web/mobile apps and calendar features.

### Differentiation

StudyFlow differentiates by combining:
- A **Dashboard workflow + Pomodoro logging + analytics** in a single system.
- **Canvas ingestion** as a first-class capability rather than an external integration.
- A **self-hosted architecture** and **privacy-first positioning**.
- An AI assistant designed around **tool-calls and retrieval over personal data**, not generic chat.

## 5. List of Features (Overall)

- Frontend–backend separation with a lightweight API server.
- FastAPI backend with async MongoDB access (Motor).
- Authentication using **JWT + session validation** (device-level session management).
- Task management with Kanban board and list view.
- Module/category management with color coding.
- Pomodoro timer per task, with persistent timer state.
- Multi-dimensional statistics dashboard (day/week/month).
- AI assistant with tool calling and optional RAG (ChromaDB).
- Canvas integration for course/assignment fetching, previewing, and syncing.
- Local development convenience (one-command startup) and production-friendly deployment (Docker-compatible).

## 6. List of Frontend Features

### Key libraries

- React (functional components, hooks)
- React Router (routing)
- Axios (HTTP client, auth interceptors)
- Recharts (visual analytics)

### UI/UX style

StudyFlow uses a **minimal, line-art inspired style**:
- bold outlines and rounded corners
- four primary pastel panels that fill the page space to represent workflow states (To Do, In Progress, Review, Done)
- compact modals and floating action buttons for “Settings” and “AI Assistant”

### Major pages

- Home / Auth (login & register)
- Dashboard (Kanban board)
- Tasks (CRUD table and modal editing)
- Focus (Pomodoro timer)
- Stats (charts and trends)
- Settings (profile, modules, AI config, consent, devices)

## 7. List of Backend Features

### Key Python packages

- FastAPI, Uvicorn (ASGI server)
- Motor (async MongoDB driver)
- Pydantic / pydantic-settings (request/response validation and configuration)
- httpx (async HTTP client for Canvas and external providers)
- python-jose, passlib[bcrypt] (JWT + password hashing)
- cryptography (field-level encryption for user API keys)
- LangChain, LangGraph, langchain-openai, chromadb (AI and RAG pipeline)

### Async vs sync usage

The backend is primarily async to support concurrent I/O:
- **Async**: Motor database calls, httpx Canvas requests, AI calls, and tool orchestration.
- **Sync**: CPU-bound or library-bound operations such as password hashing/verification and deterministic formatting.

This split ensures the event loop stays responsive while still using secure cryptographic primitives.

### AI module implementation principle

- The `/api/ai/chat` endpoint hosts a **tool-augmented agent** (LangGraph ReAct).
- Tools expose controlled actions (e.g., read stats, create tasks, fetch Canvas assignments).
- Optional RAG retrieval indexes the user’s tasks/modules in **ChromaDB** and retrieves relevant context before answering.
- Per-user model/provider configuration is supported: a user can store their own API key and model name; the key is encrypted at rest.

### Canvas third-party API integration

- Uses Canvas REST API endpoints such as:
  - `GET /api/v1/courses`
  - `GET /api/v1/courses/{course_id}/assignments`
- Communicates via `httpx.AsyncClient` with `Authorization: Bearer <CANVAS_TOKEN>`.
- Supports preview vs import/sync, and uses a structured `source` field for idempotent updates.

