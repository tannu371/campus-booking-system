/**
 * Approval Race Condition Tests
 * 
 * Tests that concurrent approval of overlapping pending bookings
 * is properly prevented using MongoDB transactions.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDatabase, closeTestDatabase } = require('../helpers/testDb');
const User = require('../../models/User');
const Room = require('../../models/Room');
const Booking = require('../../models/Booking');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test_jwt_secret';
const getToken = (userId) => jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1d' });

let dbContext;
let app;
let admin1, admin2, room, student;
let admin1Token, admin2Token;

beforeAll(async () => {
  dbContext = await connectTestDatabase();
  process.env.JWT_SECRET = JWT_SECRET;

  const express = require('express');
  app = express();
  app.use(express.json());
  app.use('/api/bookings', require('../../routes/bookingRoutes'));

  // Create test users
  admin1 = await User.create({
    name: 'Admin One',
    email: 'admin1@test.edu',
    password: 'admin123',
    role: 'admin'
  });

  admin2 = await User.create({
    name: 'Admin Two',
    email: 'admin2@test.edu',
    password: 'admin123',
    role: 'admin'
  });

  student = await User.create({
    name: 'Test Student',
    email: 'student@test.edu',
    password: 'user123',
    role: 'user'
  });

  admin1Token = getToken(admin1._id);
  admin2Token = getToken(admin2._id);

  // Create test room that requires approval
  room = await Room.create({
    name: 'Conference Room',
    type: 'conference_room',
    capacity: 50,
    building: 'Main',
    floor: 1,
    requiresApproval: true,
    bufferMinutes: 15,
    operatingHoursStart: '08:00',
    operatingHoursEnd: '20:00'
  });
});

afterAll(async () => {
  await closeTestDatabase(dbContext);
});

beforeEach(async () => {
  await Booking.deleteMany({});
});

describe('Approval Race Conditions', () => {
  test('AR-01: Two admins cannot approve overlapping pending bookings concurrently', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // Create two pending bookings with overlapping times
    const booking1 = await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Booking 1',
      date: tomorrow,
      startTime: '10:00',
      endTime: '11:00',
      status: 'pending',
      confirmationCode: 'TEST001'
    });

    const booking2 = await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Booking 2',
      date: tomorrow,
      startTime: '10:30',
      endTime: '11:30',
      status: 'pending',
      confirmationCode: 'TEST002'
    });

    // Simulate concurrent approval by two admins
    const [result1, result2] = await Promise.all([
      request(app)
        .put(`/api/bookings/${booking1._id}/status`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .send({ status: 'approved' }),
      request(app)
        .put(`/api/bookings/${booking2._id}/status`)
        .set('Authorization', `Bearer ${admin2Token}`)
        .send({ status: 'approved' })
    ]);

    // One should succeed, one should fail
    const statuses = [result1.status, result2.status].sort();
    expect(statuses).toEqual([200, 409]);

    // Verify only one booking is approved
    const approvedBookings = await Booking.find({
      room: room._id,
      date: tomorrow,
      status: 'approved'
    });

    expect(approvedBookings).toHaveLength(1);

    // The failed one should have a clear error message
    const failedResult = result1.status === 409 ? result1 : result2;
    expect(failedResult.body.error).toMatch(/APPROVAL_CONFLICT|CONCURRENT_APPROVAL_CONFLICT/);
  });

  test('AR-02: Approval racing with booking creation is prevented', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create a pending booking
    const pendingBooking = await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Pending Booking',
      date: tomorrow,
      startTime: '14:00',
      endTime: '15:00',
      status: 'pending',
      confirmationCode: 'TEST003'
    });

    // Simulate: Admin approving while another user creates overlapping booking
    const studentToken = getToken(student._id);

    const [approvalResult, createResult] = await Promise.all([
      request(app)
        .put(`/api/bookings/${pendingBooking._id}/status`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .send({ status: 'approved' }),
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: room._id,
          title: 'New Booking',
          date: tomorrow.toISOString().split('T')[0],
          startTime: '14:15',
          endTime: '15:15',
          purpose: 'Test',
          attendeeCount: 10
        })
    ]);

    // One should succeed, one should fail with conflict
    const statuses = [approvalResult.status, createResult.status].sort();
    
    // Both might succeed if they don't overlap enough, or one fails
    if (statuses[0] === 201 && statuses[1] === 201) {
      // Both succeeded - check they don't actually conflict
      const bookings = await Booking.find({
        room: room._id,
        date: tomorrow,
        status: { $in: ['approved', 'pending'] }
      });
      
      // Should have proper buffer separation
      expect(bookings.length).toBeGreaterThanOrEqual(1);
    } else {
      // One failed - verify it's a conflict error
      expect(statuses).toEqual([200, 409]);
      const failedResult = approvalResult.status === 409 ? approvalResult : createResult;
      expect(failedResult.body.error).toMatch(/CONFLICT/);
    }
  });

  test('AR-03: Idempotent approval - approving already approved booking returns success', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const booking = await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Test Booking',
      date: tomorrow,
      startTime: '16:00',
      endTime: '17:00',
      status: 'pending',
      confirmationCode: 'TEST004'
    });

    // First approval
    const result1 = await request(app)
      .put(`/api/bookings/${booking._id}/status`)
      .set('Authorization', `Bearer ${admin1Token}`)
      .send({ status: 'approved' });

    expect(result1.status).toBe(200);

    // Second approval (idempotent)
    const result2 = await request(app)
      .put(`/api/bookings/${booking._id}/status`)
      .set('Authorization', `Bearer ${admin2Token}`)
      .send({ status: 'approved' });

    expect(result2.status).toBe(200);

    // Verify still only one approved booking
    const approvedBookings = await Booking.find({
      room: room._id,
      date: tomorrow,
      status: 'approved'
    });

    expect(approvedBookings).toHaveLength(1);
  });

  test('AR-04: Multiple pending bookings for same slot - only one can be approved', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create 3 pending bookings for the exact same time slot
    const bookings = await Promise.all([
      Booking.create({
        room: room._id,
        user: student._id,
        title: 'Booking A',
        date: tomorrow,
        startTime: '09:00',
        endTime: '10:00',
        status: 'pending',
        confirmationCode: 'TESTA'
      }),
      Booking.create({
        room: room._id,
        user: student._id,
        title: 'Booking B',
        date: tomorrow,
        startTime: '09:00',
        endTime: '10:00',
        status: 'pending',
        confirmationCode: 'TESTB'
      }),
      Booking.create({
        room: room._id,
        user: student._id,
        title: 'Booking C',
        date: tomorrow,
        startTime: '09:00',
        endTime: '10:00',
        status: 'pending',
        confirmationCode: 'TESTC'
      })
    ]);

    // Try to approve all three simultaneously
    const results = await Promise.all(
      bookings.map(booking =>
        request(app)
          .put(`/api/bookings/${booking._id}/status`)
          .set('Authorization', `Bearer ${admin1Token}`)
          .send({ status: 'approved' })
      )
    );

    // Only one should succeed
    const successCount = results.filter(r => r.status === 200).length;
    const conflictCount = results.filter(r => r.status === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(2);

    // Verify only one approved booking exists
    const approvedBookings = await Booking.find({
      room: room._id,
      date: tomorrow,
      status: 'approved'
    });

    expect(approvedBookings).toHaveLength(1);
  });

  test('AR-05: Buffer time is respected during approval', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Room has 15-minute buffer
    // Create two bookings that would conflict with buffer
    const booking1 = await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Booking 1',
      date: tomorrow,
      startTime: '11:00',
      endTime: '12:00',
      status: 'pending',
      confirmationCode: 'BUF001'
    });

    const booking2 = await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Booking 2',
      date: tomorrow,
      startTime: '12:10', // Only 10 minutes after booking1 ends (buffer is 15)
      endTime: '13:00',
      status: 'pending',
      confirmationCode: 'BUF002'
    });

    // Approve first booking
    const result1 = await request(app)
      .put(`/api/bookings/${booking1._id}/status`)
      .set('Authorization', `Bearer ${admin1Token}`)
      .send({ status: 'approved' });

    expect(result1.status).toBe(200);

    // Try to approve second booking (should fail due to buffer)
    const result2 = await request(app)
      .put(`/api/bookings/${booking2._id}/status`)
      .set('Authorization', `Bearer ${admin2Token}`)
      .send({ status: 'approved' });

    expect(result2.status).toBe(409);
    expect(result2.body.error).toBe('APPROVAL_CONFLICT');
  });
});
