const AuditLog = require('../models/AuditLog');
const { sanitizeString, sanitizeObjectId, sanitizeNumber, sanitizeDate } = require('../utils/sanitizeQuery');

// @desc    Get audit logs (admin) - with NoSQL injection protection
// @route   GET /api/audit
const getAuditLogs = async (req, res) => {
  try {
    // SECURITY: Sanitize query parameters to prevent NoSQL injection
    const action = sanitizeString(req.query.action);
    const targetType = sanitizeString(req.query.targetType, ['booking', 'room', 'user']);
    const performedBy = sanitizeObjectId(req.query.performedBy);
    const startDate = sanitizeDate(req.query.startDate);
    const endDate = sanitizeDate(req.query.endDate);
    const page = sanitizeNumber(req.query.page, { min: 1, default: 1 });
    const limit = sanitizeNumber(req.query.limit, { min: 1, max: 100, default: 30 });

    const filter = {};

    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    if (performedBy) filter.performedBy = performedBy;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get recent activity feed (admin) - with NoSQL injection protection
// @route   GET /api/audit/recent
const getRecentActivity = async (req, res) => {
  try {
    // SECURITY: Sanitize limit parameter
    const limit = sanitizeNumber(req.query.limit, { min: 1, max: 50, default: 10 });
    
    const logs = await AuditLog.find()
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit);

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
