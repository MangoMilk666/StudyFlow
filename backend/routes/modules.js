const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const authRequired = require('../middleware/authRequired')

// GET /api/modules - Get all modules for user
router.get('/', authRequired, moduleController.getAllModules);

// POST /api/modules - Create new module
router.post('/', authRequired, moduleController.createModule);

// PUT /api/modules/:id - Update module
router.put('/:id', authRequired, moduleController.updateModule);

// DELETE /api/modules/:id - Delete module
router.delete('/:id', authRequired, moduleController.deleteModule);

module.exports = router;
