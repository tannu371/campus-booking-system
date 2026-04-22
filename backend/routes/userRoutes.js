const express = require('express');
const router = express.Router();
const { getUsers, getUserProfile, updateUserStatus, updateUserRole, getUserStats } = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');
const { adminMutationLimiter } = require('../middleware/rateLimiters');
const { userValidators } = require('../middleware/requestValidators');

router.get('/stats', protect, admin, getUserStats);
router.get('/', protect, admin, getUsers);
router.get('/:id', protect, admin, userValidators.userIdParam, getUserProfile);
router.put('/:id/status', protect, admin, adminMutationLimiter, userValidators.updateStatus, updateUserStatus);
router.put('/:id/role', protect, admin, adminMutationLimiter, userValidators.updateRole, updateUserRole);

module.exports = router;
