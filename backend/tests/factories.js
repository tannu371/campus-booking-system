const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

/**
 * Test Data Factories
 * Based on testing.md §2 — adapted for MongoDB/Mongoose
 */

const createTestRoom = (overrides = {}) => ({
  name: 'Test Room 301',
  type: 'meeting_room',
  capacity: 30,
  building: 'Test Building',
  floor: 3,
  amenities: ['Projector', 'Whiteboard', 'AC'],
  description: 'Test room for unit testing',
  operatingHoursStart: '07:00',
  operatingHoursEnd: '22:00',
  bufferMinutes: 10,
  requiresApproval: false,
  isAvailable: true,
  isActive: true,
  ...overrides
});

const createTestUser = async (role = 'user', overrides = {}) => {
  const User = require('../models/User');
  const data = {
    name: 'Test User',
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@campus.edu`,
    password: 'test123456',
    role,
    department: 'Test Department',
    status: 'active',
    ...overrides
  };
  return await User.create(data);
};

const createTestBooking = (overrides = {}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    title: 'Test Study Session',
    date: tomorrow,
    startTime: '09:00',
    endTime: '11:00',
    purpose: 'Testing',
    status: 'approved',
    attendeeCount: 5,
    ...overrides
  };
};

const createTestBookingRequest = (roomId, overrides = {}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    room: roomId,
    title: 'Test Study Session',
    date: tomorrow.toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '11:00',
    purpose: 'Testing',
    attendeeCount: 5,
    ...overrides
  };
};

const getAuthToken = async (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

module.exports = {
  createTestRoom,
  createTestUser,
  createTestBooking,
  createTestBookingRequest,
  getAuthToken
};
