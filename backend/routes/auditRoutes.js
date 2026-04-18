const express = require('express');
const router = express.Router();
const { getAuditLogs, getRecentActivity, getActionTypes } = require('../controllers/auditController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, admin, getAuditLogs);
router.get('/recent', protect, admin, getRecentActivity);
router.get('/actions', protect, admin, getActionTypes);

module.exports = router;
