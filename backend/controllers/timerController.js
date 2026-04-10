const TimerLog = require('../models/TimerLog');
const Task = require('../models/Task');

// Start timer
exports.startTimer = async (req, res) => {
  try {
    const { taskId } = req.body;
    const userId = req.user?.userId

    // Timer session started (tracked on frontend)
    res.json({ 
      message: 'Timer started', 
      startTime: new Date(),
      taskId,
      userId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Stop timer and save log
exports.stopTimer = async (req, res) => {
  try {
    const { taskId, duration } = req.body; // duration in minutes
    const userId = req.user?.userId

    const timerLog = new TimerLog({
      taskId,
      userId,
      duration,
      startTime: new Date(Date.now() - duration * 60000),
      endTime: new Date(),
      sessionDate: new Date(),
    });

    await timerLog.save();

    // Update task's total time spent
    const task = await Task.findById(taskId);
    if (task) {
      if (task.userId?.toString() !== String(userId)) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      task.timeSpent = (task.timeSpent || 0) + duration;
      await task.save();
    }

    res.json({ 
      message: 'Timer session saved', 
      timerLog,
      totalTimeSpent: task.timeSpent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get timer logs for task
exports.getTimerLogs = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.userId
    const logs = await TimerLog.find({ taskId, userId }).sort({ sessionDate: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get weekly statistics
exports.getWeeklyStats = async (req, res) => {
  try {
    const userId = req.user?.userId

    // Get logs from past 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const logs = await TimerLog.find({
      userId,
      sessionDate: { $gte: sevenDaysAgo },
    });

    // Group by date
    const stats = {};
    logs.forEach(log => {
      const date = log.sessionDate.toISOString().split('T')[0];
      stats[date] = (stats[date] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
