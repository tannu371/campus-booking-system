/**
 * Mass-Assignment Vulnerability Tests
 * 
 * Tests that users cannot update protected fields through mass-assignment attacks
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDatabase, disconnectTestDatabase } = require('../helpers/testDb');
const User = require('../../models/User');
const Room = require('../../models/Room');
const Booking = require('../../models/Booking');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test_jwt_secret';
const getToken = (userId) => jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1d' });

let dbContext;
let app;
let admin, student, room, booking;
let adminToken, studentToken;

beforeAll(async () => {
  dbContext = await connectTestDatabase();
  process.env.JWT_SECRET = JWT_SECRET;

  const express = require('express');
  app = express();
  app.use(express.json());
  app.use('/api/bookings', require('../../routes/bookingRoutes'));
  app.use('/api/rooms', require('../../routes/roomRoutes'));

  // Create test users
  admin = await User.create({
    name: 'Admin User',
    email: 'admin@test.edu',
    password: 'admin123',
    role: 'admin'
  });

  student = await User.create({
    name: 'Test Student',
    email: 'student@test.edu',
    password: 'user123',
    role: 'user'
  });

  adminToken = getToken(admin._id);
  studentToken = getToken(student._id);

  // Create test room
  room = await Room.create({
    name: 'Test Room',
    type: 'classroom',
    capacity: 30,
    building: 'Main',
    floor: 1,
    operatingHoursStart: '08:00',
    operatingHoursEnd: '20:00'
  });
});

afterAll(async () => {
  await disconnectTestDatabase(dbContext);
});

beforeEach(async () => {
  await Booking.deleteMany({});
  
  // Create a test booking
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  booking = await Booking.create({
    room: room._id,
    user: student._id,
    title: 'Test Booking',
    date: tomorrow,
    startTime: '10:00',
    endTime: '11:00',
    status: 'pending',
    priorityLevel: 4,
    confirmationCode: 'TEST123'
  });
});

describe('Mass-Assignment Protection - Booking Updates', () => {
  test('MA-01: User cannot escalate booking status to approved', async () => {
    const result = await request(app)
      .put(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Updated Title',
        status: 'approved'  // Attempt to bypass approval
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('PROTECTED_FIELDS');
    expect(result.body.attemptedFields).toContain('status');

    // Verify status unchanged
    const updated = await Booking.findById(booking._id);
    expect(updated.status).toBe('pending');
  });

  test('MA-02: User cannot transfer booking ownership', async () => {
    const result = await request(app)
      .put(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Updated Title',
        user: admin._id.toString()  // Attempt to transfer ownership
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('PROTECTED_FIELDS');
    expect(result.body.attemptedFields).toContain('user');

    // Verify owner unchanged
    const updated = await Booking.findById(booking._id);
    expect(updated.user.toString()).toBe(student._id.toString());
  });

  test('MA-03: User cannot set admin override flag', async () => {
    const result = await request(app)
      .put(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Updated Title',
        adminOverride: true  // Attempt privilege escalation
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('PROTECTED_FIELDS');
    expect(result.body.attemptedFields).toContain('adminOverride');

    // Verify flag unchanged
    const updated = await Booking.findById(booking._id);
    expect(updated.adminOverride).toBe(false);
  });

  test('MA-04: User cannot manipulate priority level', async () => {
    const result = await request(app)
      .put(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Updated Title',
        priorityLevel: 1  // Attempt to escalate priority
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('PROTECTED_FIELDS');
    expect(result.body.attemptedFields).toContain('priorityLevel');

    // Verify priority unchanged
    const updated = await Booking.findById(booking._id);
    expect(updated.priorityLevel).toBe(4);
  });

  test('MA-05: User cannot change confirmation code', async () => {
    const result = await request(app)
      .put(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Updated Title',
        confirmationCode: 'HACKED'
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('PROTECTED_FIELDS');

    // Verify code unchanged
    const updated = await Booking.findById(booking._id);
    expect(updated.confirmationCode).toBe('TEST123');
  });

  test('MA-06: User cannot manipulate check-in status', async () => {
    const result = await request(app)
      .put(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Updated Title',
        checkedIn: true,
        checkInTime: new Date()
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('PROTECTED_FIELDS');

    // Verify check-in unchanged
    const updated = await Booking.findById(booking._id);
    expect(updated.checkedIn).toBe(false);
    expect(updated.checkInTime).toBeNull();
  });

  test('MA-07: User cannot change room after creation', async () => {
    const otherRoom = await Room.create({
      name: 'Other Room',
      type: 'classroom',
      capacity: 20,
      building: 'Other',
      floor: 1
    });

    const result = await request(app)
      .put(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Updated Title',
        room: otherRoom._id.toString()
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('PROTECTED_FIELDS');

    // Verify room unchanged
    const updated = await Booking.findById(booking._id);
    expect(updated.room.toString()).toBe(room._id.toString());
  });

  test('MA-08: User CAN update allowed fields', async () => {
    const result = await request(app)
      .put(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Updated Title',
        purpose: 'Updated Purpose',
        attendeeCount: 25
      });

    expect(result.status).toBe(200);
    expect(result.body.title).toBe('Updated Title');
    expect(result.body.purpose).toBe('Updated Purpose');
    expect(result.body.attendeeCount).toBe(25);

    // Verify protected fields unchanged
    expect(result.body.status).toBe('pending');
    expect(result.body.priorityLevel).toBe(4);
  });

  test('MA-09: Admin gets more allowed fields but still protected', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const result = await request(app)
      .put(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Admin Updated',
        date: tomorrow.toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00',
        status: 'approved'  // Still protected even for admin
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('PROTECTED_FIELDS');
    expect(result.body.attemptedFields).toContain('status');
  });

  test('MA-10: Multiple protected fields rejected together', async () => {
    const result = await request(app)
      .put(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Updated',
        status: 'approved',
        priorityLevel: 1,
        adminOverride: true,
        user: admin._id.toString()
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('PROTECTED_FIELDS');
    expect(result.body.attemptedFields).toEqual(
      expect.arrayContaining(['status', 'priorityLevel', 'adminOverride', 'user'])
    );
  });
});

describe('Mass-Assignment Protection - Room Updates', () => {
  test('MA-11: Admin cannot bypass soft-delete via isActive', async () => {
    const result = await request(app)
      .put(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Updated Room',
        isActive: false  // Should use DELETE endpoint
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('PROTECTED_FIELDS');
    expect(result.body.attemptedFields).toContain('isActive');

    // Verify isActive unchanged
    const updated = await Room.findById(room._id);
    expect(updated.isActive).toBe(true);
  });

  test('MA-12: Admin cannot manipulate timestamps', async () => {
    const result = await request(app)
      .put(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Updated Room',
        createdAt: new Date('2020-01-01'),
        updatedAt: new Date('2020-01-01')
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('PROTECTED_FIELDS');
  });

  test('MA-13: Admin CAN update allowed room fields', async () => {
    const result = await request(app)
      .put(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Updated Room Name',
        capacity: 50,
        amenities: ['Projector', 'Whiteboard'],
        requiresApproval: true
      });

    expect(result.status).toBe(200);
    expect(result.body.name).toBe('Updated Room Name');
    expect(result.body.capacity).toBe(50);
    expect(result.body.requiresApproval).toBe(true);
  });
});

describe('Mass-Assignment Protection - Room Creation', () => {
  test('MA-14: Cannot set protected fields during room creation', async () => {
    const result = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Room',
        type: 'classroom',
        capacity: 30,
        building: 'Test',
        floor: 1,  // Required field
        isActive: false,  // Should default to true (not in whitelist)
        _id: 'custom_id'  // Should be auto-generated (not in whitelist)
      });

    // Should succeed but ignore protected fields
    expect(result.status).toBe(201);
    expect(result.body.isActive).toBe(true);  // Default value, not false
    expect(result.body._id).not.toBe('custom_id');  // Auto-generated
  });
});
