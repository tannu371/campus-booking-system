const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'BOOKING_CREATED', 'BOOKING_CANCELLED', 'BOOKING_UPDATED', 'BOOKING_APPROVED',
      'BOOKING_REJECTED', 'BOOKING_CHECKED_IN', 'ADMIN_OVERRIDE',
      'ROOM_CREATED', 'ROOM_UPDATED', 'ROOM_DEACTIVATED', 'ROOM_DELETED',
      'USER_REGISTERED', 'USER_SUSPENDED', 'USER_ACTIVATED', 'USER_DEACTIVATED',
      'USER_LOGIN', 'USER_ROLE_CHANGED',
      'SYSTEM_SEED', 'SYSTEM_ERROR'
    ]
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  targetType: {
    type: String,
    enum: ['booking', 'room', 'user', 'system'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
