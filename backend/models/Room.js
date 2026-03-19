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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Room', roomSchema);
