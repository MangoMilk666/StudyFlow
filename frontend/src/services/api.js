import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const LS_TOKEN_KEY = 'sf_token_v1'
const LS_USER_KEY = 'sf_user_v1'

function redirectToAuthIfNeeded() {
  try {
    const path = window.location?.pathname || ''
    if (path.startsWith('/auth')) return
    window.location.assign('/auth')
  } catch {
    // ignore
  }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(LS_TOKEN_KEY)

    const url = String(config.url || '')
    const isAuth = url.startsWith('/auth/')
    const isHealth = url === '/health'

    if (!token && !isAuth && !isHealth) {
      redirectToAuthIfNeeded()
      return Promise.reject(new Error('AUTH_REQUIRED'))
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      try {
        localStorage.removeItem(LS_TOKEN_KEY)
        localStorage.removeItem(LS_USER_KEY)
      } catch {
        // ignore
      }
      redirectToAuthIfNeeded()
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: (username, email, password) =>
    apiClient.post('/auth/register', { username, email, password }),
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }),
  updateEmail: (email) => apiClient.patch('/auth/email', { email }),
};

// Task API
export const taskAPI = {
  getAllTasks: () => apiClient.get('/tasks'),
  createTask: (taskData) => apiClient.post('/tasks', taskData),
  getTaskById: (id) => apiClient.get(`/tasks/${id}`),
  updateTask: (id, updates) => apiClient.put(`/tasks/${id}`, updates),
  deleteTask: (id) => apiClient.delete(`/tasks/${id}`),
  updateTaskStatus: (id, status) =>
    apiClient.patch(`/tasks/${id}/status`, { status }),
  addSubtask: (id, text) => apiClient.post(`/tasks/${id}/subtask`, { text }),
};

// Module API
export const moduleAPI = {
  getAllModules: () => apiClient.get('/modules'),
  createModule: (moduleData) => apiClient.post('/modules', moduleData),
  updateModule: (id, updates) => apiClient.put(`/modules/${id}`, updates),
  deleteModule: (id) => apiClient.delete(`/modules/${id}`),
};

// Timer API
export const timerAPI = {
  startTimer: (taskId) => apiClient.post('/timer/start', { taskId }),
  stopTimer: (taskId, duration, status) => apiClient.post('/timer/stop', { taskId, duration, status }),
  getTimerLogs: (taskId) => apiClient.get(`/timer/logs/${taskId}`),
  getWeeklyStats: (userId) => apiClient.get(`/timer/weekly-stats/${userId}`),
};

export const statsAPI = {
  getSummary: (range) => apiClient.get(`/stats/summary?range=${encodeURIComponent(range || 'week')}`),
  getTaskStats: (taskId) => apiClient.get(`/stats/task/${encodeURIComponent(taskId)}`),
}

export const aiAPI = {
  chat: (message, history) => apiClient.post('/ai/chat', { message, history }),
}

export const canvasAPI = {
  getCourses: () => apiClient.get('/canvas/courses'),
  previewAssignments: (courseIds) => apiClient.post('/canvas/preview-assignments', { courseIds }),
  importAssignments: (courseIds) => apiClient.post('/canvas/import-assignments', { courseIds }),
  syncAssignments: (courseIds) => apiClient.post('/canvas/sync-assignments', { courseIds }),
}

export default apiClient;
