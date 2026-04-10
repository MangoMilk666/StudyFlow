const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authRequired = require('../middleware/authRequired')

// GET /api/tasks - Get all tasks for user
router.get('/', authRequired, taskController.getAllTasks);

// POST /api/tasks - Create new task
router.post('/', authRequired, taskController.createTask);

// GET /api/tasks/:id - Get task by ID
router.get('/:id', authRequired, taskController.getTaskById);

// PUT /api/tasks/:id - Update task
router.put('/:id', authRequired, taskController.updateTask);

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', authRequired, taskController.deleteTask);

// PATCH /api/tasks/:id/status - Update task status
router.patch('/:id/status', authRequired, taskController.updateTaskStatus);

// POST /api/tasks/:id/subtask - Add subtask
router.post('/:id/subtask', authRequired, taskController.addSubtask);

module.exports = router;
