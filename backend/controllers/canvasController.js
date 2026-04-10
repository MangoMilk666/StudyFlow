const Task = require('../models/Task')
const { createCanvasClient, listAssignments, listCourses } = require('../services/canvasClient')

function htmlToText(html) {
  if (!html) return ''
  const s = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
  return s
}

function normalizePriority() {
  return 'Medium'
}

function pickCourses(allCourses, courseIds) {
  const ids = Array.isArray(courseIds) ? courseIds.map(String) : []
  if (!ids.length) return allCourses
  return allCourses.filter((c) => ids.includes(String(c.id)))
}

exports.getCourses = async (req, res) => {
  try {
    const client = createCanvasClient()
    const courses = await listCourses(client)
    const result = courses.map((c) => ({
      id: c.id,
      name: c.name,
      course_code: c.course_code,
      workflow_state: c.workflow_state,
    }))
    return res.json(result)
  } catch (err) {
    if (err.code === 'CANVAS_NOT_CONFIGURED') {
      return res.status(500).json({ error: err.message })
    }
    return res.status(500).json({ error: err.message })
  }
}

exports.syncAssignments = async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { courseIds } = req.body || {}
    const client = createCanvasClient()

    const allCourses = await listCourses(client)
    const selectedCourses = pickCourses(allCourses, courseIds)

    let created = 0
    let updated = 0
    const skipped = []

    for (const course of selectedCourses) {
      const assignments = await listAssignments(client, course.id)

      for (const a of assignments) {
        const assignmentId = String(a.id || '')
        const courseId = String(course.id || '')
        const title = String(a.name || '').trim()
        if (!assignmentId || !courseId || !title) {
          skipped.push({ courseId, assignmentId })
          continue
        }

        const description = htmlToText(a.description)
        const deadline = a.due_at ? new Date(a.due_at) : null
        const unlockAt = a.unlock_at ? new Date(a.unlock_at) : null

        const updateDoc = {
          userId,
          title,
          description,
          deadline,
          moduleName: String(course.name || ''),
          priority: normalizePriority(),
          status: 'To Do',
          source: {
            type: 'canvas',
            courseId,
            assignmentId,
          },
        }

        if (unlockAt && !Number.isNaN(unlockAt.getTime())) {
          updateDoc.unlockAt = unlockAt
        }

        const existing = await Task.findOne({
          userId,
          'source.type': 'canvas',
          'source.courseId': courseId,
          'source.assignmentId': assignmentId,
        })

        if (existing) {
          await Task.updateOne({ _id: existing._id }, { $set: updateDoc })
          updated += 1
        } else {
          await Task.create(updateDoc)
          created += 1
        }
      }
    }

    return res.json({ ok: true, created, updated, skipped: skipped.length })
  } catch (err) {
    if (err.code === 'CANVAS_NOT_CONFIGURED') {
      return res.status(500).json({ error: err.message })
    }
    if (err.response?.status) {
      return res.status(502).json({ error: `Canvas API error: HTTP ${err.response.status}` })
    }
    return res.status(500).json({ error: err.message })
  }
}

exports.previewAssignments = async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { courseIds } = req.body || {}
    const client = createCanvasClient()

    const allCourses = await listCourses(client)
    const selectedCourses = pickCourses(allCourses, courseIds)

    const out = []
    for (const course of selectedCourses) {
      const assignments = await listAssignments(client, course.id)
      for (const a of assignments) {
        const assignmentId = String(a.id || '')
        const courseId = String(course.id || '')
        const title = String(a.name || '').trim()
        if (!assignmentId || !courseId || !title) continue

        out.push({
          courseId,
          courseName: String(course.name || ''),
          assignmentId,
          name: title,
          due_at: a.due_at || null,
          unlock_at: a.unlock_at || null,
        })
      }
    }

    return res.json({ ok: true, assignments: out })
  } catch (err) {
    if (err.code === 'CANVAS_NOT_CONFIGURED') {
      return res.status(500).json({ error: err.message })
    }
    if (err.response?.status) {
      return res.status(502).json({ error: `Canvas API error: HTTP ${err.response.status}` })
    }
    return res.status(500).json({ error: err.message })
  }
}

exports.importAssignments = exports.syncAssignments
