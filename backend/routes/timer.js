const express = require('express');
const router = express.Router();
const timerController = require('../controllers/timerController');

// POST /api/timer/start - Start timer session
router.post('/start', timerController.startTimer);

// POST /api/timer/stop - Stop timer and save log
router.post('/stop', timerController.stopTimer);

// GET /api/timer/logs/:taskId - Get timer logs for task
router.get('/logs/:taskId', timerController.getTimerLogs);

// GET /api/timer/weekly-stats/:userId - Get weekly statistics
router.get('/weekly-stats/:userId', timerController.getWeeklyStats);

module.exports = router;
