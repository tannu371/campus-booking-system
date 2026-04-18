/**
 * Integration Tests: Room API
 * CRUD, search, building list, soft-delete
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer, app;
const Room = require('../../models/Room');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test_jwt_secret';
const getToken = (userId) => jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1d' });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = JWT_SECRET;

  const express = require('express');
  app = express();
  app.use(express.json());
  app.use('/api/rooms', require('../../routes/roomRoutes'));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Room API', () => {
  let adminUser, adminToken, userToken;

  beforeAll(async () => {
    adminUser = await User.create({
      name: 'Room Admin', email: 'roomadmin@test.edu', password: 'admin123', role: 'admin'
    });
    const normalUser = await User.create({
      name: 'Normal User', email: 'roomuser@test.edu', password: 'user123', role: 'user'
    });
    adminToken = getToken(adminUser._id);
    userToken = getToken(normalUser._id);
  });

  afterEach(async () => {
    await Room.deleteMany({});
  });

  describe('GET /api/rooms', () => {
    test('Should return all active rooms', async () => {
      await Room.create([
        { name: 'Room A', type: 'classroom', capacity: 30, building: 'A', floor: 1 },
        { name: 'Room B', type: 'lab', capacity: 20, building: 'B', floor: 2 }
      ]);
      const res = await request(app).get('/api/rooms');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    test('Should filter by search query', async () => {
      await Room.create([
        { name: 'Lecture Hall X1', type: 'classroom', capacity: 100, building: 'A', floor: 1 },
        { name: 'Study Room Y1', type: 'meeting_room', capacity: 10, building: 'B', floor: 1 }
      ]);
      const res = await request(app).get('/api/rooms?search=Lecture');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Lecture Hall X1');
    });

    test('Should filter by building', async () => {
      await Room.create([
        { name: 'R1', type: 'classroom', capacity: 30, building: 'Science Block', floor: 1 },
        { name: 'R2', type: 'lab', capacity: 20, building: 'Arts Block', floor: 1 }
      ]);
      const res = await request(app).get('/api/rooms?building=Science Block');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    test('Should filter by type', async () => {
      await Room.create([
        { name: 'L1', type: 'lab', capacity: 25, building: 'A', floor: 1 },
        { name: 'C1', type: 'classroom', capacity: 30, building: 'A', floor: 1 }
      ]);
      const res = await request(app).get('/api/rooms?type=lab');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].type).toBe('lab');
    });
  });

  describe('GET /api/rooms/buildings', () => {
    test('Should return unique building names', async () => {
      await Room.create([
        { name: 'R1', type: 'classroom', capacity: 30, building: 'Block A', floor: 1 },
        { name: 'R2', type: 'lab', capacity: 20, building: 'Block B', floor: 1 },
        { name: 'R3', type: 'lab', capacity: 25, building: 'Block A', floor: 2 }
      ]);
      const res = await request(app).get('/api/rooms/buildings');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body).toContain('Block A');
      expect(res.body).toContain('Block B');
    });
  });

  describe('POST /api/rooms (admin)', () => {
    test('Admin can create a room', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Lab', type: 'lab', capacity: 25,
          building: 'Science', floor: 2, amenities: ['AC']
        });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Lab');
    });

    test('Non-admin cannot create a room', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Sneaky Room', type: 'lab', capacity: 25,
          building: 'Test', floor: 1
        });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/rooms/:id (soft-delete)', () => {
    test('Admin can soft-delete a room', async () => {
      const room = await Room.create({
        name: 'Delete Me', type: 'classroom', capacity: 30, building: 'A', floor: 1
      });
      const res = await request(app)
        .delete(`/api/rooms/${room._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const deleted = await Room.findById(room._id);
      expect(deleted.isActive).toBe(false);
    });
  });
});
