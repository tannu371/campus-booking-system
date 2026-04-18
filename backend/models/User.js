const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'faculty', 'staff'],
    default: 'user'
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deactivated'],
    default: 'active'
  },
  maxActiveBookings: {
    type: Number,
    default: 5
  },
  suspendedUntil: {
    type: Date,
    default: null
  },
  suspendReason: {
    type: String,
    default: ''
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if user can create bookings
userSchema.methods.canBook = function() {
  if (this.status === 'suspended') {
    return { allowed: false, reason: 'ACCOUNT_SUSPENDED', suspendedUntil: this.suspendedUntil };
  }
  if (this.status === 'deactivated') {
    return { allowed: false, reason: 'ACCOUNT_DEACTIVATED' };
  }
  return { allowed: true };
};

module.exports = mongoose.model('User', userSchema);
