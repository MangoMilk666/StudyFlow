const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');

// GET /api/modules - Get all modules for user
router.get('/', moduleController.getAllModules);

// POST /api/modules - Create new module
router.post('/', moduleController.createModule);

// PUT /api/modules/:id - Update module
router.put('/:id', moduleController.updateModule);

// DELETE /api/modules/:id - Delete module
router.delete('/:id', moduleController.deleteModule);

module.exports = router;
