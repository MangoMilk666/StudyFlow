const axios = require('axios')

function normalizeBaseUrl(value) {
  const v = String(value || '').trim().replace(/\/$/, '')
  return v
}

function createCanvasClient() {
  const baseUrl = normalizeBaseUrl(process.env.CANVAS_BASE_URL)
  const token = String(process.env.CANVAS_TOKEN || '').trim()

  if (!baseUrl || !token) {
    const missing = []
    if (!baseUrl) missing.push('CANVAS_BASE_URL')
    if (!token) missing.push('CANVAS_TOKEN')
    const err = new Error(`Canvas not configured: missing ${missing.join(', ')}`)
    err.code = 'CANVAS_NOT_CONFIGURED'
    throw err
  }

  return axios.create({
    baseURL: baseUrl,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 8000,
  })
}

async function listCourses(client) {
  const resp = await client.get('/api/v1/courses', {
    params: {
      per_page: 100,
    },
  })
  return resp.data || []
}

async function listAssignments(client, courseId) {
  const resp = await client.get(`/api/v1/courses/${encodeURIComponent(String(courseId))}/assignments`, {
    params: {
      per_page: 100,
    },
  })
  return resp.data || []
}

module.exports = {
  createCanvasClient,
  listCourses,
  listAssignments,
}

