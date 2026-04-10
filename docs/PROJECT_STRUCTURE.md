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
├── server.js              # Express server entry point
├── package.json          # Dependencies with MongoDB, bcrypt, JWT
├── Dockerfile            # Docker configuration with health check
├── .env.example          # Environment variables template
│
├── models/               # MongoDB schemas
│   ├── User.js          # User document model
│   ├── Task.js          # Task document model
│   ├── Module.js        # Course/project module model
│   └── TimerLog.js      # Timer session logs
│
├── routes/              # API endpoints
│   ├── auth.js          # POST /register, /login
│   ├── tasks.js         # CRUD operations for tasks
│   ├── modules.js       # CRUD operations for modules
│   └── timer.js         # Timer and statistics
│
└── controllers/         # Business logic
    ├── authController.js
    ├── taskController.js
    ├── moduleController.js
    └── timerController.js
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
GET    /api/tasks?userId=xxx              # List all tasks
POST   /api/tasks                         # Create task
GET    /api/tasks/:id                     # Get task details
PUT    /api/tasks/:id                     # Update task
DELETE /api/tasks/:id                     # Delete task
PATCH  /api/tasks/:id/status              # Update status (To Do, In Progress, Review, Done)
POST   /api/tasks/:id/subtask             # Add subtask
```

### Modules (Courses)
```
GET    /api/modules?userId=xxx            # List modules
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
```

## 📊 Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique, lowercase),
  password: String (bcrypt-hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### Task Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  title: String,
  description: String,
  status: String (To Do | In Progress | Review | Done),
  priority: String (Low | Medium | High),
  deadline: Date,
  module: ObjectId (ref: Module),
  timeSpent: Number (minutes),
  subtasks: [{ text: String, completed: Boolean }],
  createdAt: Date,
  updatedAt: Date
}
```

### Module Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  name: String,
  colorCode: String (hex color),
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

### TimerLog Collection
```javascript
{
  _id: ObjectId,
  taskId: ObjectId (ref: Task),
  userId: ObjectId (ref: User),
  duration: Number (minutes),
  startTime: Date,
  endTime: Date,
  sessionDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🐳 Docker Setup

### Build & Run with Docker Compose
```bash
# Start all services (MongoDB + Backend + Frontend)
docker-compose up --build

# Services will be available at:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:5000
# - MongoDB: mongodb://localhost:27017
```

### Environment Variables

**Backend (.env)**
```
PORT=5000
MONGO_URI=mongodb://database:27017/studyflow
JWT_SECRET=your_secret_key_here
NODE_ENV=production
```

**Frontend (.env)**
```
VITE_API_BASE_URL=/api
```

## 🏃 Development Guide

### Backend Development
```bash
cd backend
npm install
npm start
# Server runs on http://localhost:5000
# Health check: GET /api/health
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
| **Frontend** | React 19 + Material-UI 5 |
| **Build Tool** | Vite (fast bundler) |
| **Backend** | Node.js + Express 5 |
| **Database** | MongoDB |
| **Authentication** | JWT + bcryptjs |
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
