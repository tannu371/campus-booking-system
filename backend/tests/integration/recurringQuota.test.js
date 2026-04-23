/**
 * Recurring Booking Quota Enforcement Tests
 * 
 * Tests that recurring bookings respect role-based quota limits
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
let student, faculty, admin, room;
let studentToken, facultyToken, adminToken;

beforeAll(async () => {
  dbContext = await connectTestDatabase();
  process.env.JWT_SECRET = JWT_SECRET;

  const express = require('express');
  app = express();
  app.use(express.json());
  app.use('/api/bookings', require('../../routes/bookingRoutes'));

  // Create test users with different quotas
  student = await User.create({
    name: 'Test Student',
    email: 'student@test.edu',
    password: 'user123',
    role: 'user',
    maxActiveBookings: 5  // Student quota
  });

  faculty = await User.create({
    name: 'Test Faculty',
    email: 'faculty@test.edu',
    password: 'faculty123',
    role: 'faculty',
    maxActiveBookings: 20  // Faculty quota
  });

  admin = await User.create({
    name: 'Test Admin',
    email: 'admin@test.edu',
    password: 'admin123',
    role: 'admin',
    maxActiveBookings: 50  // Admin quota
  });

  studentToken = getToken(student._id);
  facultyToken = getToken(faculty._id);
  adminToken = getToken(admin._id);

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
});

describe('Recurring Booking Quota Enforcement', () => {
  test('RQ-01: Student cannot exceed quota via recurring booking', async () => {
    // Setup: Student has 2 active bookings, quota = 5
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Existing Booking 1',
      date: tomorrow,
      startTime: '09:00',
      endTime: '10:00',
      status: 'approved'
    });

    await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Existing Booking 2',
      date: new Date(tomorrow.getTime() + 86400000),
      startTime: '09:00',
      endTime: '10:00',
      status: 'pending'
    });

    // Attack: Try to create 10-occurrence recurring booking
    const result = await request(app)
      .post('/api/bookings/recurring')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        room: room._id,
        title: 'Weekly Meeting',
        date: new Date(tomorrow.getTime() + 172800000).toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00',
        purpose: 'Test',
        recurrenceRule: 'FREQ=WEEKLY;COUNT=10'
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('RECURRING_QUOTA_EXCEEDED');
    expect(result.body.current).toBe(2);
    expect(result.body.requested).toBe(10);
    expect(result.body.maximum).toBe(5);
    expect(result.body.available).toBe(3);

    // Verify no new bookings created
    const totalBookings = await Booking.countDocuments({ user: student._id });
    expect(totalBookings).toBe(2);  // Only the 2 existing bookings
  });

  test('RQ-02: Student can create recurring booking within quota', async () => {
    // Setup: Student has 2 active bookings, quota = 5, available = 3
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Existing Booking 1',
      date: tomorrow,
      startTime: '09:00',
      endTime: '10:00',
      status: 'approved'
    });

    await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Existing Booking 2',
      date: new Date(tomorrow.getTime() + 86400000),
      startTime: '09:00',
      endTime: '10:00',
      status: 'pending'
    });

    // Valid: Create 3-occurrence recurring booking (exactly at limit)
    const result = await request(app)
      .post('/api/bookings/recurring')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        room: room._id,
        title: 'Weekly Meeting',
        date: new Date(tomorrow.getTime() + 172800000).toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00',
        purpose: 'Test',
        recurrenceRule: 'FREQ=WEEKLY;COUNT=3'
      });

    expect(result.status).toBe(201);
    expect(result.body.created).toBe(3);
    expect(result.body.groupId).toBeDefined();

    // Verify total bookings = 5 (at quota)
    const totalActive = await Booking.countDocuments({
      user: student._id,
      status: { $in: ['pending', 'approved'] },
      date: { $gte: new Date() }
    });
    expect(totalActive).toBe(5);
  });

  test('RQ-03: Faculty has higher quota and can create more bookings', async () => {
    // Setup: Faculty has 15 active bookings, quota = 20, available = 5
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create 15 existing bookings
    for (let i = 0; i < 15; i++) {
      await Booking.create({
        room: room._id,
        user: faculty._id,
        title: `Existing Booking ${i + 1}`,
        date: new Date(tomorrow.getTime() + i * 86400000),
        startTime: '09:00',
        endTime: '10:00',
        status: 'approved'
      });
    }

    // Valid: Create 5-occurrence recurring booking
    const result = await request(app)
      .post('/api/bookings/recurring')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        room: room._id,
        title: 'Faculty Seminar',
        date: new Date(tomorrow.getTime() + 1728000000).toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00',
        purpose: 'Test',
        recurrenceRule: 'FREQ=WEEKLY;COUNT=5'
      });

    expect(result.status).toBe(201);
    expect(result.body.created).toBe(5);

    // Verify total = 20 (at faculty quota)
    const totalActive = await Booking.countDocuments({
      user: faculty._id,
      status: { $in: ['pending', 'approved'] },
      date: { $gte: new Date() }
    });
    expect(totalActive).toBe(20);
  });

  test('RQ-04: Admin has highest quota', async () => {
    // Setup: Admin has 40 active bookings, quota = 50, available = 10
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create 40 existing bookings
    for (let i = 0; i < 40; i++) {
      await Booking.create({
        room: room._id,
        user: admin._id,
        title: `Admin Booking ${i + 1}`,
        date: new Date(tomorrow.getTime() + i * 86400000),
        startTime: '09:00',
        endTime: '10:00',
        status: 'approved'
      });
    }

    // Valid: Create 10-occurrence recurring booking
    const result = await request(app)
      .post('/api/bookings/recurring')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        room: room._id,
        title: 'Admin Meeting',
        date: new Date(tomorrow.getTime() + 3456000000).toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00',
        purpose: 'Test',
        recurrenceRule: 'FREQ=WEEKLY;COUNT=10'
      });

    expect(result.status).toBe(201);
    expect(result.body.created).toBe(10);

    // Verify total = 50 (at admin quota)
    const totalActive = await Booking.countDocuments({
      user: admin._id,
      status: { $in: ['pending', 'approved'] },
      date: { $gte: new Date() }
    });
    expect(totalActive).toBe(50);
  });

  test('RQ-05: Cancelled bookings do not count toward quota', async () => {
    // Setup: Student has 2 active + 3 cancelled bookings
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 2 active bookings
    await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Active 1',
      date: tomorrow,
      startTime: '09:00',
      endTime: '10:00',
      status: 'approved'
    });

    await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Active 2',
      date: new Date(tomorrow.getTime() + 86400000),
      startTime: '09:00',
      endTime: '10:00',
      status: 'pending'
    });

    // 3 cancelled bookings (should not count)
    for (let i = 0; i < 3; i++) {
      await Booking.create({
        room: room._id,
        user: student._id,
        title: `Cancelled ${i + 1}`,
        date: new Date(tomorrow.getTime() + (i + 2) * 86400000),
        startTime: '09:00',
        endTime: '10:00',
        status: 'cancelled'
      });
    }

    // Should be able to create 3 more (quota = 5, active = 2)
    const result = await request(app)
      .post('/api/bookings/recurring')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        room: room._id,
        title: 'Weekly Meeting',
        date: new Date(tomorrow.getTime() + 604800000).toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00',
        purpose: 'Test',
        recurrenceRule: 'FREQ=WEEKLY;COUNT=3'
      });

    expect(result.status).toBe(201);
    expect(result.body.created).toBe(3);
  });

  test('RQ-06: Past bookings do not count toward quota', async () => {
    // Setup: Student has 2 future + 3 past bookings
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // 2 future bookings
    await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Future 1',
      date: tomorrow,
      startTime: '09:00',
      endTime: '10:00',
      status: 'approved'
    });

    await Booking.create({
      room: room._id,
      user: student._id,
      title: 'Future 2',
      date: new Date(tomorrow.getTime() + 86400000),
      startTime: '09:00',
      endTime: '10:00',
      status: 'approved'
    });

    // 3 past bookings (should not count)
    for (let i = 0; i < 3; i++) {
      await Booking.create({
        room: room._id,
        user: student._id,
        title: `Past ${i + 1}`,
        date: new Date(yesterday.getTime() - i * 86400000),
        startTime: '09:00',
        endTime: '10:00',
        status: 'approved'
      });
    }

    // Should be able to create 3 more (quota = 5, active future = 2)
    const result = await request(app)
      .post('/api/bookings/recurring')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        room: room._id,
        title: 'Weekly Meeting',
        date: new Date(tomorrow.getTime() + 172800000).toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00',
        purpose: 'Test',
        recurrenceRule: 'FREQ=WEEKLY;COUNT=3'
      });

    expect(result.status).toBe(201);
    expect(result.body.created).toBe(3);
  });

  test('RQ-07: Error message provides helpful information', async () => {
    // Setup: Student at quota limit
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (let i = 0; i < 5; i++) {
      await Booking.create({
        room: room._id,
        user: student._id,
        title: `Booking ${i + 1}`,
        date: new Date(tomorrow.getTime() + i * 86400000),
        startTime: '09:00',
        endTime: '10:00',
        status: 'approved'
      });
    }

    // Try to create 1 more
    const result = await request(app)
      .post('/api/bookings/recurring')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        room: room._id,
        title: 'One More',
        date: new Date(tomorrow.getTime() + 604800000).toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00',
        purpose: 'Test',
        recurrenceRule: 'FREQ=WEEKLY;COUNT=1'
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('RECURRING_QUOTA_EXCEEDED');
    expect(result.body.message).toContain('Cannot create 1 recurring bookings');
    expect(result.body.message).toContain('limit of 5');
    expect(result.body.current).toBe(5);
    expect(result.body.requested).toBe(1);
    expect(result.body.maximum).toBe(5);
    expect(result.body.available).toBe(0);
  });
});
