const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const { authValidators } = require('../middleware/requestValidators');

router.post('/register', authLimiter, authValidators.register, register);
router.post('/login', authLimiter, authValidators.login, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', authLimiter, logout);
router.get('/me', protect, getMe);

module.exports = router;
