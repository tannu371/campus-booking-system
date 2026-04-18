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
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed', 'no_show'],
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
  checkedIn: {
    type: Boolean,
    default: false
  },
  checkInTime: {
    type: Date,
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
  }
}, {
  timestamps: true
});

// Compound index for efficient conflict detection queries
bookingSchema.index({ room: 1, date: 1, status: 1 });
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
