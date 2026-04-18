const express = require('express');
const router = express.Router();
const { getUsers, getUserProfile, updateUserStatus, updateUserRole, getUserStats } = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

router.get('/stats', protect, admin, getUserStats);
router.get('/', protect, admin, getUsers);
router.get('/:id', protect, admin, getUserProfile);
router.put('/:id/status', protect, admin, updateUserStatus);
router.put('/:id/role', protect, admin, updateUserRole);

module.exports = router;
