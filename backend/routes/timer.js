const express = require('express');
const router = express.Router();
const timerController = require('../controllers/timerController');
const authRequired = require('../middleware/authRequired')

// POST /api/timer/start - Start timer session
router.post('/start', authRequired, timerController.startTimer);

// POST /api/timer/stop - Stop timer and save log
router.post('/stop', authRequired, timerController.stopTimer);

// GET /api/timer/logs/:taskId - Get timer logs for task
router.get('/logs/:taskId', authRequired, timerController.getTimerLogs);

// GET /api/timer/weekly-stats/:userId - Get weekly statistics
router.get('/weekly-stats/:userId', authRequired, timerController.getWeeklyStats);

module.exports = router;
