const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authRequired = require('../middleware/authRequired')

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// PATCH /api/auth/email
router.patch('/email', authRequired, authController.updateEmail)

module.exports = router;
