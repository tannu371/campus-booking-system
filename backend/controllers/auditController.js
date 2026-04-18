const AuditLog = require('../models/AuditLog');

// @desc    Get audit logs (admin)
// @route   GET /api/audit
const getAuditLogs = async (req, res) => {
  try {
    const { action, targetType, performedBy, startDate, endDate, page = 1, limit = 30 } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    if (performedBy) filter.performedBy = performedBy;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      logs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get recent activity feed (admin)
// @route   GET /api/audit/recent
const getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const logs = await AuditLog.find()
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get available action types (for filter dropdown)
// @route   GET /api/audit/actions
const getActionTypes = async (req, res) => {
  try {
    const actions = await AuditLog.distinct('action');
    res.json(actions.sort());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAuditLogs, getRecentActivity, getActionTypes };
