const express = require('express')

const authRequired = require('../middleware/authRequired')
const canvasController = require('../controllers/canvasController')

const router = express.Router()

router.get('/courses', authRequired, canvasController.getCourses)
router.post('/sync-assignments', authRequired, canvasController.syncAssignments)

module.exports = router

