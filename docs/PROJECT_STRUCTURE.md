# StudyFlow - Complete Project Structure

## 🎯 Project Overview
StudyFlow is a professional learning task management platform with:
- ✅ Kanban board for task organization
- ⏱️ Pomodoro timer for focused study sessions
- 📊 Weekly statistics and analytics
- 🎨 Multi-module support with color coding
- 🔐 User authentication system

## 📁 Architecture

### Backend (`/backend`)
```
backend/
├── app/                  # FastAPI application package
│   ├── main.py           # FastAPI entry point
│   ├── config.py         # Settings (.env)
│   ├── deps.py           # JWT auth dependency
│   ├── errors.py         # Unified error response
│   ├── models/           # Pydantic models (request/response schemas)
│   ├── routers/          # API routes: auth/tasks/modules/timer/stats/ai/canvas
│   ├── services/         # DB, security, RAG/AI, canvas client
│   └── utils/            # datetime/mongo helpers
│
├── requirements.txt      # Python dependencies
├── Dockerfile            # Backend container build (uvicorn)
└── .env.example          # Environment variables template
```

### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── App.jsx              # Main app with routing
│   ├── main.jsx             # React entry point
│   ├── App.css              # Application styles
│   ├── index.css            # Global styles
│   │
│   ├── pages/              # Page components
│   │   ├── HomePage.jsx    # Login/Register page
│   │   ├── Dashboard.jsx   # Main kanban board view
│   │   ├── TasksPage.jsx   # Task list view
│   │   └── SettingsPage.jsx # Module management
│   │
│   ├── components/         # Reusable components
│   │   ├── KanbanBoard.jsx      # Drag-drop kanban
│   │   ├── TaskForm.jsx         # Task creation modal
│   │   ├── PomodoroTimer.jsx    # 25-min timer
│   │   └── WeeklyStats.jsx      # Analytics chart
│   │
│   ├── services/           # API communication
│   │   └── api.js         # Axios wrapper with auth
│   │
│   ├── hooks/             # Custom hooks
│   │   └── useData.js     # useAuth, useTasks, useModules
│   │
│   ├── assets/            # Images and static files
│   └── public/            # Static HTML
│
├── Dockerfile            # Multi-stage build with nginx
├── nginx.conf           # Nginx configuration
├── package.json         # Dependencies: React 19, MUI 5, Vite
├── vite.config.js       # Vite bundler config
└── eslint.config.js     # Code quality rules
```

## 🚀 API Routes

### Authentication
```
POST /api/auth/register
  { username, email, password }

POST /api/auth/login
  { email, password }
  → { token, userId, username }
```

### Tasks
```
GET    /api/tasks                         # List tasks (JWT required)
POST   /api/tasks                         # Create task
GET    /api/tasks/:id                     # Get task details
PUT    /api/tasks/:id                     # Update task
DELETE /api/tasks/:id                     # Delete task
PATCH  /api/tasks/:id/status              # Update status (To Do, In Progress, Review, Done)
POST   /api/tasks/:id/subtask             # Add subtask
```

### Modules (Courses)
```
GET    /api/modules                       # List modules (JWT required)
POST   /api/modules                       # Create module
PUT    /api/modules/:id                   # Update module
DELETE /api/modules/:id                   # Delete module
```

### Timer & Statistics
```
POST   /api/timer/start                   # Start session
POST   /api/timer/stop                    # Save session
GET    /api/timer/logs/:taskId            # Get task timer logs
GET    /api/timer/weekly-stats/:userId    # Weekly statistics
GET    /api/stats/summary?range=day|week|month  # Stats summary
```

## 📊 Database Schema

### User Collection
```json
{
  "_id": "ObjectId",
  "username": "string",
  "email": "string",
  "password": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Task Collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "title": "string",
  "description": "string",
  "status": "string",
  "priority": "string",
  "deadline": "Date|null",
  "module": "ObjectId|null",
  "moduleName": "string",
  "timeSpent": "number",
  "subtasks": [
    {
      "text": "string",
      "completed": "boolean"
    }
  ],
  "source": {
    "type": "string",
    "courseId": "string",
    "assignmentId": "string"
  },
  "unlockAt": "Date|null",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Module Collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "name": "string",
  "colorCode": "string",
  "description": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### TimerLog Collection
```json
{
  "_id": "ObjectId",
  "taskId": "ObjectId",
  "userId": "ObjectId",
  "duration": "number",
  "startTime": "Date",
  "endTime": "Date",
  "sessionDate": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## 🐳 Docker Setup

### Build & Run with Docker Compose
```bash
# Start all services (MongoDB + Backend + Frontend)
docker compose up --build

# Services will be available at:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:8000
# - MongoDB: mongodb://localhost:27017
```

### Environment Variables

**Backend (.env)**
```
PORT=8000
MONGO_URI=mongodb://database:27017/studyflow
JWT_SECRET=your_secret_key_here
MOCK_MODE=false
```

**Frontend (.env)**
```
VITE_API_BASE_URL=/api
```

## 🏃 Development Guide

### Backend Development
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
# Dev server runs on http://localhost:5173
# Hot reload enabled
```

## 📝 Key Features Implemented

### 1. **Kanban Board**
- Four columns: To Do, In Progress, Review, Done
- Drag-and-drop task movement (UI ready)
- Priority color coding

### 2. **Task Management**
- Create/edit/delete tasks
- Set priority (High/Medium/Low)
- Add deadlines
- Breakdown into subtasks

### 3. **Pomodoro Timer**
- 25-minute focus sessions
- Auto-save time spent
- Session counter

### 4. **Module Organization**
- Create custom course modules
- Assign color themes
- Filter tasks by module

### 5. **Weekly Analytics**
- Bar chart of tasks completed
- Total focus hours
- Daily breakdown

### 6. **Authentication**
- User registration & login
- Password hashing with bcrypt
- JWT token authentication
- Session persistence

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + Vite |
| **Build Tool** | Vite (fast bundler) |
| **Backend** | FastAPI (Python) |
| **Database** | MongoDB (motor) |
| **Authentication** | JWT + bcrypt |
| **HTTP Client** | Axios |
| **Containerization** | Docker + Docker Compose |
| **Web Server** | Nginx (production) |

## ✅ Next Steps (Optional Enhancements)

1. **Frontend**
   - Implement drag-and-drop with react-beautiful-dnd
   - Add real-time updates with WebSocket
   - Local state management with Context API

2. **Backend**
   - Add request validation middleware
   - Implement rate limiting
   - Add logging/monitoring

3. **Database**
   - Add indexes for performance
   - Implement data backup strategy

4. **DevOps**
   - Add CI/CD pipeline
   - Implement health checks
   - Add container orchestration

## 📖 File Descriptions

### Core Server Files
- **server.js**: Express app setup, middleware, routes, MongoDB connection
- **models/*.js**: Mongoose schema definitions for all collections
- **routes/*.js**: API endpoint definitions (GET, POST, PUT, DELETE, PATCH)
- **controllers/*.js**: Request handlers and business logic

### Frontend Entry Points
- **App.jsx**: Main component with page routing and auth state
- **main.jsx**: React app initialization
- **pages/**: Full-page components for different views
- **components/**: Reusable UI components
- **services/api.js**: Centralized API client with interceptors
- **hooks/useData.js**: Custom hooks for state management

### Docker Configuration
- **backend/Dockerfile**: Node.js with health checks
- **frontend/Dockerfile**: Multi-stage build with nginx
- **frontend/nginx.conf**: Proxy configuration to backend
- **docker-compose.yml**: Orchestrates all services

## 🧪 Testing Mock Data

The application includes mock data for immediate testing:
- Demo tasks with various priorities and statuses
- Sample modules (IT5007, CS5242)
- Mock timer data for analytics

No initial setup required - just run the containers!

---

**Author**: StudyFlow Team  
**Created**: 2026-03-31  
**Version**: 1.0.0
