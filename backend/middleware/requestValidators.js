const { body, param, validationResult } = require('express-validator');

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    message: 'Validation failed',
    error: 'VALIDATION_ERROR',
    details: errors.array().map((e) => ({
      field: e.path,
      message: e.msg
    }))
  });
};

const authValidators = {
  register: [
    body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isString().isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 chars'),
    body('department').optional({ checkFalsy: true }).isString().isLength({ max: 120 }),
    body('phone').optional({ checkFalsy: true }).isString().isLength({ max: 30 }),
    validate
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isString().isLength({ min: 1 }).withMessage('Password is required'),
    validate
  ]
};

const roomValidators = {
  roomIdParam: [
    param('id').matches(OBJECT_ID_REGEX).withMessage('Invalid room id'),
    validate
  ],
  createRoom: [
    body('name').isString().trim().isLength({ min: 1, max: 120 }),
    body('type').isIn(['classroom', 'lab', 'seminar_hall', 'conference_room', 'meeting_room']),
    body('capacity').isInt({ min: 1, max: 10000 }).withMessage('Capacity must be between 1 and 10000'),
    body('building').isString().trim().isLength({ min: 1, max: 120 }),
    body('floor').optional().isInt({ min: 0, max: 200 }),
    body('operatingHoursStart').optional().matches(HHMM_REGEX).withMessage('operatingHoursStart must be HH:MM'),
    body('operatingHoursEnd').optional().matches(HHMM_REGEX).withMessage('operatingHoursEnd must be HH:MM'),
    body('bufferMinutes').optional().isInt({ min: 0, max: 180 }),
    body('requiresApproval').optional().isBoolean(),
    body('isAvailable').optional().isBoolean(),
    body('amenities').optional().isArray(),
    validate
  ],
  updateRoom: [
    param('id').matches(OBJECT_ID_REGEX).withMessage('Invalid room id'),
    body('name').optional().isString().trim().isLength({ min: 1, max: 120 }),
    body('type').optional().isIn(['classroom', 'lab', 'seminar_hall', 'conference_room', 'meeting_room']),
    body('capacity').optional().isInt({ min: 1, max: 10000 }),
    body('building').optional().isString().trim().isLength({ min: 1, max: 120 }),
    body('floor').optional().isInt({ min: 0, max: 200 }),
    body('operatingHoursStart').optional().matches(HHMM_REGEX).withMessage('operatingHoursStart must be HH:MM'),
    body('operatingHoursEnd').optional().matches(HHMM_REGEX).withMessage('operatingHoursEnd must be HH:MM'),
    body('bufferMinutes').optional().isInt({ min: 0, max: 180 }),
    body('requiresApproval').optional().isBoolean(),
    body('isAvailable').optional().isBoolean(),
    body('amenities').optional().isArray(),
    validate
  ]
};

const bookingValidators = {
  createBooking: [
    body('room').matches(OBJECT_ID_REGEX).withMessage('Valid room id is required'),
    body('title').isString().trim().isLength({ min: 1, max: 200 }),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
    body('startTime').matches(HHMM_REGEX).withMessage('startTime must be HH:MM'),
    body('endTime').matches(HHMM_REGEX).withMessage('endTime must be HH:MM'),
    body('attendeeCount').optional({ nullable: true }).isInt({ min: 1, max: 10000 })
      .withMessage('attendeeCount must be an integer between 1 and 10000'),
    body('purpose').optional({ nullable: true }).isString().isLength({ max: 500 }),
    validate
  ],
  createRecurringBooking: [
    body('room').matches(OBJECT_ID_REGEX).withMessage('Valid room id is required'),
    body('title').isString().trim().isLength({ min: 1, max: 200 }),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
    body('startTime').matches(HHMM_REGEX).withMessage('startTime must be HH:MM'),
    body('endTime').matches(HHMM_REGEX).withMessage('endTime must be HH:MM'),
    body('recurrenceRule').isString().isLength({ min: 1, max: 200 }).withMessage('recurrenceRule is required'),
    body('attendeeCount').optional({ nullable: true }).isInt({ min: 1, max: 10000 }),
    body('purpose').optional({ nullable: true }).isString().isLength({ max: 500 }),
    validate
  ],
  bookingIdParam: [
    param('id').matches(OBJECT_ID_REGEX).withMessage('Invalid booking id'),
    validate
  ],
  roomIdParam: [
    param('roomId').matches(OBJECT_ID_REGEX).withMessage('Invalid room id'),
    validate
  ],
  updateBooking: [
    param('id').matches(OBJECT_ID_REGEX).withMessage('Invalid booking id'),
    body('title').optional().isString().trim().isLength({ min: 1, max: 200 }),
    body('purpose').optional({ nullable: true }).isString().isLength({ max: 500 }),
    body('attendeeCount').optional({ nullable: true }).isInt({ min: 1, max: 10000 }),
    body('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
    body('startTime').optional().matches(HHMM_REGEX).withMessage('startTime must be HH:MM'),
    body('endTime').optional().matches(HHMM_REGEX).withMessage('endTime must be HH:MM'),
    validate
  ],
  updateBookingStatus: [
    param('id').matches(OBJECT_ID_REGEX).withMessage('Invalid booking id'),
    body('status').isIn(['approved', 'rejected', 'cancelled']).withMessage('Invalid status'),
    body('reason').optional({ nullable: true }).isString().isLength({ max: 500 }),
    validate
  ],
  adminOverride: [
    body('existingBookingId').matches(OBJECT_ID_REGEX).withMessage('existingBookingId must be valid'),
    body('title').isString().trim().isLength({ min: 1, max: 200 }),
    body('overrideReason').isString().trim().isLength({ min: 1, max: 500 }),
    body('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
    body('startTime').optional().matches(HHMM_REGEX).withMessage('startTime must be HH:MM'),
    body('endTime').optional().matches(HHMM_REGEX).withMessage('endTime must be HH:MM'),
    body('purpose').optional({ nullable: true }).isString().isLength({ max: 500 }),
    validate
  ]
};

const userValidators = {
  userIdParam: [
    param('id').matches(OBJECT_ID_REGEX).withMessage('Invalid user id'),
    validate
  ],
  updateStatus: [
    param('id').matches(OBJECT_ID_REGEX).withMessage('Invalid user id'),
    body('status').isIn(['active', 'suspended', 'deactivated']).withMessage('Invalid status'),
    body('reason').optional({ nullable: true }).isString().isLength({ max: 500 }),
    validate
  ],
  updateRole: [
    param('id').matches(OBJECT_ID_REGEX).withMessage('Invalid user id'),
    body('role').isIn(['user', 'staff', 'faculty', 'admin']).withMessage('Invalid role'),
    validate
  ]
};

module.exports = {
  authValidators,
  roomValidators,
  bookingValidators,
  userValidators
};
