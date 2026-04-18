const AuditLog = require('../models/AuditLog');

/**
 * Log an audit event
 * @param {string} action - The action type (e.g., 'BOOKING_CREATED')
 * @param {object} options - { performedBy, targetType, targetId, details, ipAddress }
 */
const logAudit = async (action, options = {}) => {
  try {
    await AuditLog.create({
      action,
      performedBy: options.performedBy || null,
      targetType: options.targetType || 'system',
      targetId: options.targetId || null,
      details: options.details || {},
      ipAddress: options.ipAddress || ''
    });
  } catch (error) {
    // Never let audit logging break the main flow
    console.error(`⚠️ Audit log failed for ${action}:`, error.message);
  }
};

/**
 * Express middleware to attach IP to request for audit
 */
const attachIp = (req, res, next) => {
  req.clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
  next();
};

module.exports = { logAudit, attachIp };
