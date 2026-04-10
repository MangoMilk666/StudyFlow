const Task = require('../models/Task');

function ensureOwner(task, userId) {
  return task && task.userId && task.userId.toString() === String(userId)
}

// Get all tasks for user
exports.getAllTasks = async (req, res) => {
  try {
    const userId = req.user?.userId
    const tasks = await Task.find({ userId }).populate('module');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new task
exports.createTask = async (req, res) => {
  try {
    const userId = req.user?.userId
    const { title, description, priority, deadline, module, moduleName, status } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title required' })
    }

    const task = new Task({
      userId,
      title,
      description,
      priority,
      deadline,
      module,
      moduleName,
      status: status || 'To Do',
    });

    await task.save();
    await task.populate('module');
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get task by ID
exports.getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id).populate('module');
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (!ensureOwner(task, req.user?.userId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = await Task.findById(id)
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' })
    }
    if (!ensureOwner(existing, req.user?.userId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const task = await Task.findByIdAndUpdate(id, updates, { new: true }).populate('module');
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Task.findById(id)
    if (!existing) return res.status(404).json({ error: 'Task not found' })
    if (!ensureOwner(existing, req.user?.userId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    await Task.findByIdAndDelete(id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existing = await Task.findById(id)
    if (!existing) return res.status(404).json({ error: 'Task not found' })
    if (!ensureOwner(existing, req.user?.userId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const task = await Task.findByIdAndUpdate(id, { status }, { new: true }).populate('module');
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add subtask
exports.addSubtask = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!ensureOwner(task, req.user?.userId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    task.subtasks.push({ text, completed: false });
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
