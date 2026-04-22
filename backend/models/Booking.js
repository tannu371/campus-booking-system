const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  title: {
    type: String,
    required: [true, 'Booking title is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  bookingDateKey: {
    type: String,
    required: [true, 'Booking date key is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required']
  },
  purpose: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed', 'no_show', 'auto_released'],
    default: 'approved'
  },
  attendeeCount: {
    type: Number,
    min: 1,
    default: null
  },
  confirmationCode: {
    type: String,
    unique: true,
    sparse: true
  },
  cancelReason: {
    type: String,
    trim: true,
    default: ''
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  checkedIn: {
    type: Boolean,
    default: false
  },
  checkInTime: {
    type: Date,
    default: null
  },
  checkInCode: {
    type: String,
    default: null
  },
  adminOverride: {
    type: Boolean,
    default: false
  },
  overrideReason: {
    type: String,
    trim: true,
    default: ''
  },
  priorityLevel: {
    type: Number,
    min: 1,
    max: 5,
    default: 4
  },
  autoReleaseAt: {
    type: Date,
    default: null
  },
  startDateTimeUtc: {
    type: Date,
    required: [true, 'UTC start datetime is required']
  },
  endDateTimeUtc: {
    type: Date,
    required: [true, 'UTC end datetime is required']
  },
  // Recurring booking fields
  recurrenceRule: {
    type: String,
    default: null
  },
  recurrenceGroupId: {
    type: String,
    default: null
  },
  recurrenceIndex: {
    type: Number,
    default: null
  },
  isRecurringParent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for efficient conflict detection queries
bookingSchema.index({ room: 1, date: 1, status: 1 });
bookingSchema.index({ room: 1, bookingDateKey: 1, status: 1 });
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ status: 1, date: 1 });
bookingSchema.index({ autoReleaseAt: 1, status: 1, checkedIn: 1 });
bookingSchema.index({ recurrenceGroupId: 1 });

// CRITICAL: Partial unique index for atomic conflict prevention across multi-instance deploys
// Prevents double-booking when multiple Node processes/replicas handle concurrent requests
// Only enforces uniqueness for bookings that block the slot (approved/pending)
bookingSchema.index(
  { room: 1, date: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['approved', 'pending'] }
    },
    name: 'unique_room_date_startTime_active'
  }
);

bookingSchema.pre('validate', function populateDerivedUtcFields(next) {
  if (!this.date || !this.startTime || !this.endTime) {
    return next();
  }

  if (!this.bookingDateKey) {
    const baseDate = new Date(this.date);
    const year = baseDate.getUTCFullYear();
    const month = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(baseDate.getUTCDate()).padStart(2, '0');
    this.bookingDateKey = `${year}-${month}-${day}`;
  }

  const [year, month, day] = this.bookingDateKey.split('-').map(Number);
  const [startHour, startMinute] = this.startTime.split(':').map(Number);
  const [endHour, endMinute] = this.endTime.split(':').map(Number);

  if (!this.startDateTimeUtc) {
    this.startDateTimeUtc = new Date(Date.UTC(year, month - 1, day, startHour, startMinute, 0, 0));
  }
  if (!this.endDateTimeUtc) {
    this.endDateTimeUtc = new Date(Date.UTC(year, month - 1, day, endHour, endMinute, 0, 0));
  }

  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
