# API Examples

## Base URL
```
http://localhost:5000/api
```

---

## 1. Authentication Endpoints

### Register New User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@studyflow.com",
  "password": "password123"
}

# Response (201 Created)
{
  "message": "User registered successfully",
  "userId": "65a1b2c3d4e5f6g7h8i9j0k1"
}
```

### Login User
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@studyflow.com",
  "password": "password123"
}

# Response (200 OK)
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "username": "john_doe"
}
```

---

## 2. Task Endpoints

### Get All Tasks
```bash
GET /api/tasks?userId=65a1b2c3d4e5f6g7h8i9j0k1
Authorization: Bearer <token>

# Response (200 OK)
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "title": "Complete Assignment 1",
    "description": "Finish all questions from Chapter 3",
    "status": "In Progress",
    "priority": "High",
    "deadline": "2026-04-10T00:00:00.000Z",
    "timeSpent": 120,
    "subtasks": [
      { "text": "Review lecture notes", "completed": true },
      { "text": "Solve practice problems", "completed": false }
    ],
    "module": "65a1b2c3d4e5f6g7h8i9j0k5",
    "createdAt": "2026-03-31T10:00:00.000Z",
    "updatedAt": "2026-03-31T14:30:00.000Z"
  }
]
```

### Create New Task
```bash
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "title": "Study for Midterm Exam",
  "description": "Review chapters 1-5 from course materials",
  "priority": "High",
  "deadline": "2026-04-15",
  "module": "65a1b2c3d4e5f6g7h8i9j0k5"
}

# Response (201 Created)
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
  "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "title": "Study for Midterm Exam",
  "description": "Review chapters 1-5 from course materials",
  "status": "To Do",
  "priority": "High",
  "deadline": "2026-04-15T00:00:00.000Z",
  "timeSpent": 0,
  "subtasks": [],
  "module": "65a1b2c3d4e5f6g7h8i9j0k5",
  "createdAt": "2026-03-31T15:00:00.000Z",
  "updatedAt": "2026-03-31T15:00:00.000Z"
}
```

### Update Task Status
```bash
PATCH /api/tasks/65a1b2c3d4e5f6g7h8i9j0k2/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "Review"
}

# Response (200 OK)
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
  "status": "Review",
  "updatedAt": "2026-03-31T16:00:00.000Z"
  // ... rest of task object
}
```

### Add Subtask
```bash
POST /api/tasks/65a1b2c3d4e5f6g7h8i9j0k2/subtask
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Submit final answer"
}

# Response (200 OK)
{
  "subtasks": [
    { "text": "Review lecture notes", "completed": true },
    { "text": "Solve practice problems", "completed": false },
    { "text": "Submit final answer", "completed": false }
  ]
  // ... rest of task object
}
```

### Delete Task
```bash
DELETE /api/tasks/65a1b2c3d4e5f6g7h8i9j0k2
Authorization: Bearer <token>

# Response (200 OK)
{
  "message": "Task deleted successfully"
}
```

---

## 3. Module Endpoints

### Get All Modules
```bash
GET /api/modules?userId=65a1b2c3d4e5f6g7h8i9j0k1
Authorization: Bearer <token>

# Response (200 OK)
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k5",
    "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "IT5007",
    "colorCode": "#3f51b5",
    "description": "Software Engineering",
    "createdAt": "2026-03-31T09:00:00.000Z",
    "updatedAt": "2026-03-31T09:00:00.000Z"
  },
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k6",
    "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "CS5242",
    "colorCode": "#f44336",
    "description": "Machine Learning",
    "createdAt": "2026-03-31T09:05:00.000Z",
    "updatedAt": "2026-03-31T09:05:00.000Z"
  }
]
```

### Create New Module
```bash
POST /api/modules
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "name": "CS5201",
  "colorCode": "#4caf50",
  "description": "Algorithm Design"
}

# Response (201 Created)
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k7",
  "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "name": "CS5201",
  "colorCode": "#4caf50",
  "description": "Algorithm Design",
  "createdAt": "2026-03-31T16:00:00.000Z",
  "updatedAt": "2026-03-31T16:00:00.000Z"
}
```

---

## 4. Timer Endpoints

### Start Timer Session
```bash
POST /api/timer/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "taskId": "65a1b2c3d4e5f6g7h8i9j0k2",
  "userId": "65a1b2c3d4e5f6g7h8i9j0k1"
}

# Response (200 OK)
{
  "message": "Timer started",
  "startTime": "2026-03-31T16:00:00.000Z",
  "taskId": "65a1b2c3d4e5f6g7h8i9j0k2",
  "userId": "65a1b2c3d4e5f6g7h8i9j0k1"
}
```

### Stop Timer and Save Session
```bash
POST /api/timer/stop
Authorization: Bearer <token>
Content-Type: application/json

{
  "taskId": "65a1b2c3d4e5f6g7h8i9j0k2",
  "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "duration": 25
}

# Response (200 OK)
{
  "message": "Timer session saved",
  "timerLog": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k8",
    "taskId": "65a1b2c3d4e5f6g7h8i9j0k2",
    "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "duration": 25,
    "startTime": "2026-03-31T16:00:00.000Z",
    "endTime": "2026-03-31T16:25:00.000Z",
    "sessionDate": "2026-03-31T16:25:00.000Z"
  },
  "totalTimeSpent": 145
}
```

### Get Timer Logs for Task
```bash
GET /api/timer/logs/65a1b2c3d4e5f6g7h8i9j0k2
Authorization: Bearer <token>

# Response (200 OK)
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k8",
    "taskId": "65a1b2c3d4e5f6g7h8i9j0k2",
    "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "duration": 25,
    "startTime": "2026-03-31T16:00:00.000Z",
    "endTime": "2026-03-31T16:25:00.000Z",
    "sessionDate": "2026-03-31T16:25:00.000Z"
  }
]
```

### Get Weekly Statistics
```bash
GET /api/timer/weekly-stats/65a1b2c3d4e5f6g7h8i9j0k1
Authorization: Bearer <token>

# Response (200 OK)
{
  "2026-03-25": 5,
  "2026-03-26": 7,
  "2026-03-27": 4,
  "2026-03-28": 6,
  "2026-03-29": 8,
  "2026-03-30": 3,
  "2026-03-31": 2
}
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "error": "User already exists"
}
```

### 401 - Unauthorized
```json
{
  "error": "Invalid credentials"
}
```

### 404 - Not Found
```json
{
  "error": "Task not found"
}
```

### 500 - Server Error
```json
{
  "error": "Internal server error message"
}
```

---

## Frontend API Usage Example

```javascript
// src/services/api.js already includes these examples

// Register user
await authAPI.register('john', 'john@example.com', 'password123');

// Login
const { token, userId } = await authAPI.login('john@example.com', 'password123');

// Get tasks
const tasks = await taskAPI.getAllTasks(userId);

// Create task
const task = await taskAPI.createTask({
  userId,
  title: 'Study',
  priority: 'High',
  deadline: '2026-04-10'
});

// Update status
await taskAPI.updateTaskStatus(taskId, 'In Progress');

// Save timer
await timerAPI.stopTimer(taskId, userId, 25);
```

---

**API Version**: 1.0.0  
**Last Updated**: 2026-03-31
