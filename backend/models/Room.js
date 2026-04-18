const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['classroom', 'seminar_hall', 'meeting_room', 'conference_room', 'lab'],
    required: [true, 'Room type is required']
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: 1
  },
  building: {
    type: String,
    required: [true, 'Building name is required'],
    trim: true
  },
  floor: {
    type: Number,
    required: [true, 'Floor number is required']
  },
  amenities: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  operatingHoursStart: {
    type: String,
    default: '07:00'
  },
  operatingHoursEnd: {
    type: String,
    default: '22:00'
  },
  bufferMinutes: {
    type: Number,
    default: 10,
    min: 0,
    max: 60
  },
  requiresApproval: {
    type: Boolean,
    default: false
  },
  internalNotes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient queries
roomSchema.index({ building: 1, floor: 1 });
roomSchema.index({ type: 1, isAvailable: 1, isActive: 1 });

module.exports = mongoose.model('Room', roomSchema);
