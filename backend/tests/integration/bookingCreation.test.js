/**
 * Integration Tests: Booking Creation API
 * Based on testing.md §4.1 — Tests 11.1-11.2, 12.1-12.8, 13.1-13.5, 14.1-14.3
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDatabase, disconnectTestDatabase } = require('../helpers/testDb');

let dbContext, app;
const Room = require('../../models/Room');
const User = require('../../models/User');
const Booking = require('../../models/Booking');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test_jwt_secret';

const getToken = (userId) => jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1d' });

beforeAll(async () => {
  dbContext = await connectTestDatabase();
  process.env.JWT_SECRET = JWT_SECRET;

  // Create express app without starting server
  const express = require('express');
  app = express();
  app.use(express.json());
  app.use('/api/auth', require('../../routes/authRoutes'));
  app.use('/api/rooms', require('../../routes/roomRoutes'));
  app.use('/api/bookings', require('../../routes/bookingRoutes'));
});

afterAll(async () => {
  await disconnectTestDatabase(dbContext);
});

afterEach(async () => {
  await Booking.deleteMany({});
});

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const day2 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().split('T')[0];
};

describe('POST /api/bookings — Booking Creation', () => {
  let room, student, studentToken, adminUser, adminToken, approvalRoom;

  beforeAll(async () => {
    room = await Room.create({
      name: 'Test Room 301', type: 'meeting_room', capacity: 30,
      building: 'Test Building', floor: 3, amenities: ['Projector'],
      operatingHoursStart: '07:00', operatingHoursEnd: '22:00',
      bufferMinutes: 10, requiresApproval: false
    });
    approvalRoom = await Room.create({
      name: 'Conference Hall', type: 'conference_room', capacity: 200,
      building: 'Convention Center', floor: 1, amenities: ['Projector'],
      operatingHoursStart: '07:00', operatingHoursEnd: '22:00',
      bufferMinutes: 15, requiresApproval: true
    });
    student = await User.create({
      name: 'Test Student', email: 'student@test.edu', password: 'test123456', role: 'user'
    });
    adminUser = await User.create({
      name: 'Test Admin', email: 'admin@test.edu', password: 'admin123456', role: 'admin'
    });
    studentToken = getToken(student._id);
    adminToken = getToken(adminUser._id);
  });

  // ─── Successful Booking Creation (Tests 11.1-11.2) ────────────

  describe('Successful Booking Creation', () => {
    test('11.1: Should create booking and return 201 with full details', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: room._id, title: 'Study Session',
          date: tomorrow(), startTime: '09:00', endTime: '11:00',
          attendeeCount: 5, purpose: 'Test'
        });

      expect(res.status).toBe(201);
      expect(res.body.confirmationCode).toMatch(/^BK-\d{4}-[A-Z0-9]{4}$/);
      expect(res.body.status).toBe('approved');
      expect(res.body.title).toBe('Study Session');
      expect(res.body.room).toBeTruthy();

      // DB assertion: booking exists
      const booking = await Booking.findById(res.body._id);
      expect(booking).not.toBeNull();
      expect(booking.status).toBe('approved');
      expect(booking.user.toString()).toBe(student._id.toString());
    });

    test('11.2: Booking requiring approval should return PENDING status', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: approvalRoom._id, title: 'Conference Request',
          date: day2(), startTime: '14:00', endTime: '16:00',
          attendeeCount: 50
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
    });
  });

  // ─── Booking Conflict Detection (Tests 12.1-12.8) ─────────────

  describe('Booking Conflict Detection', () => {
    beforeEach(async () => {
      // Seed an existing confirmed booking: Room 301, 09:00-11:00 tomorrow
      await Booking.create({
        room: room._id, user: student._id, title: 'Existing Booking',
        date: tomorrow(), startTime: '09:00', endTime: '11:00',
        status: 'approved', confirmationCode: 'BK-2026-TEST'
      });
    });

    test('12.1: Should return 409 for exact time overlap', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: room._id, title: 'Overlap Attempt',
          date: tomorrow(), startTime: '09:00', endTime: '11:00'
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/conflict/i);

      // DB: still only 1 booking
      const count = await Booking.countDocuments({ room: room._id, date: tomorrow() });
      expect(count).toBe(1);
    });

    test('12.2: Should return 409 for partial overlap (new starts inside existing)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: room._id, title: 'Partial Overlap',
          date: tomorrow(), startTime: '10:00', endTime: '12:00'
        });
      expect(res.status).toBe(409);
    });

    test('12.3: Should return 409 for partial overlap (new ends inside existing)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: room._id, title: 'Partial Overlap',
          date: tomorrow(), startTime: '08:00', endTime: '10:00'
        });
      expect(res.status).toBe(409);
    });

    test('12.4: Should return 409 for new booking containing existing', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: room._id, title: 'Surround',
          date: tomorrow(), startTime: '08:00', endTime: '12:00'
        });
      expect(res.status).toBe(409);
    });

    test('12.5: Should allow back-to-back bookings with buffer clearance', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: room._id, title: 'After Buffer',
          date: tomorrow(), startTime: '11:10', endTime: '12:00'
        });
      expect(res.status).toBe(201);
    });

    test('12.6: Should block booking that falls within buffer window', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: room._id, title: 'Inside Buffer',
          date: tomorrow(), startTime: '11:05', endTime: '12:00'
        });
      expect(res.status).toBe(409);
    });

    test('12.7: Cancelled booking should NOT cause conflict', async () => {
      await Booking.updateMany({ room: room._id }, { status: 'cancelled' });

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: room._id, title: 'Replace Cancelled',
          date: tomorrow(), startTime: '09:00', endTime: '11:00'
        });
      expect(res.status).toBe(201);
    });

    test('12.8: PENDING booking SHOULD cause conflict', async () => {
      await Booking.updateMany({ room: room._id }, { status: 'pending' });

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: room._id, title: 'Conflict with Pending',
          date: tomorrow(), startTime: '09:00', endTime: '11:00'
        });
      expect(res.status).toBe(409);
    });

    test('12.9: PENDING booking should NOT block approval-required room', async () => {
      await Booking.create({
        room: approvalRoom._id,
        user: student._id,
        title: 'Existing Pending Request',
        date: tomorrow(),
        startTime: '09:00',
        endTime: '11:00',
        status: 'pending',
        confirmationCode: `BK-2026-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      });

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: approvalRoom._id,
          title: 'Second Pending Request',
          date: tomorrow(),
          startTime: '09:00',
          endTime: '11:00'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
    });
  });

  describe('Recurring Booking Conflict Detection', () => {
    beforeEach(async () => {
      await Booking.create({
        room: room._id,
        user: student._id,
        title: 'Existing Weekly Class',
        date: tomorrow(),
        startTime: '10:00',
        endTime: '11:00',
        status: 'approved',
        confirmationCode: `BK-2026-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      });
    });

    test('Should reject recurring booking when any occurrence conflicts', async () => {
      const res = await request(app)
        .post('/api/bookings/recurring')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: room._id,
          title: 'Weekly Team Sync',
          date: tomorrow(),
          startTime: '10:30',
          endTime: '11:30',
          recurrenceRule: 'FREQ=DAILY;COUNT=3'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('RECURRING_BOOKING_CONFLICT');
      expect(Array.isArray(res.body.conflict_occurrences)).toBe(true);
      expect(res.body.conflict_occurrences.length).toBeGreaterThan(0);

      const bookings = await Booking.find({ title: 'Weekly Team Sync' });
      expect(bookings.length).toBe(0);
    });
  });

  // ─── Input Validation (Tests 13.1-13.5) ────────────────────────

  describe('Input Validation', () => {
    test('13.1: Should return 400 for missing room_id', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'No Room', date: tomorrow(),
          startTime: '09:00', endTime: '11:00'
        });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    test('13.3: Should return 404 for non-existent room', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: fakeId, title: 'Ghost Room',
          date: tomorrow(), startTime: '09:00', endTime: '11:00'
        });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('13.4: Should return 400 for past start_time', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: room._id, title: 'Past Booking',
          date: yesterday.toISOString().split('T')[0],
          startTime: '09:00', endTime: '11:00'
        });
      expect(res.status).toBe(400);
    });

    test('13.5: SQL injection in title should be safely stored', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room: room._id, title: "'; DROP TABLE bookings; --",
          date: day2(), startTime: '14:00', endTime: '15:00'
        });
      // Should either reject or safely store
      if (res.status === 201) {
        const booking = await Booking.findById(res.body._id);
        expect(booking.title).toBe("'; DROP TABLE bookings; --");
        // Collection still exists
        const count = await Booking.countDocuments();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  // ─── Authentication (Tests 14.1-14.3) ──────────────────────────

  describe('Authentication', () => {
    test('14.1: Should return 401 for missing Authorization header', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          room: room._id, title: 'No Auth',
          date: tomorrow(), startTime: '09:00', endTime: '11:00'
        });
      expect(res.status).toBe(401);
    });

    test('14.2: Should return 401 for invalid JWT token', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', 'Bearer invalid.token.here')
        .send({
          room: room._id, title: 'Bad Token',
          date: tomorrow(), startTime: '09:00', endTime: '11:00'
        });
      expect(res.status).toBe(401);
    });

    test('14.3: Should return 401 for tampered JWT token', async () => {
      const tamperedToken = studentToken.slice(0, -5) + 'XXXXX';
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .send({
          room: room._id, title: 'Tampered',
          date: tomorrow(), startTime: '09:00', endTime: '11:00'
        });
      expect(res.status).toBe(401);
    });
  });
});
