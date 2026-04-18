/**
 * Integration Tests: User Management API
 * Suspend, activate, role changes (admin-only)
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer, app;
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
  app.use('/api/users', require('../../routes/userRoutes'));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('User Management API', () => {
  let adminUser, adminToken, student, userToken;

  beforeAll(async () => {
    adminUser = await User.create({
      name: 'User Admin', email: 'useradmin@test.edu', password: 'admin123', role: 'admin'
    });
    student = await User.create({
      name: 'Test Student', email: 'userstudent@test.edu', password: 'user123', role: 'user'
    });
    adminToken = getToken(adminUser._id);
    userToken = getToken(student._id);
  });

  describe('GET /api/users (admin)', () => {
    test('Admin can list users (paginated response)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      // API returns { users, total, page, totalPages }
      expect(res.body.users).toBeDefined();
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThanOrEqual(2);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
    });

    test('Non-admin cannot list users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/users/:id/status (admin)', () => {
    test('Admin can suspend a user', async () => {
      const res = await request(app)
        .put(`/api/users/${student._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended', reason: 'Policy violation' });
      expect(res.status).toBe(200);

      const updated = await User.findById(student._id);
      expect(updated.status).toBe('suspended');
    });

    test('Admin can activate a suspended user', async () => {
      await User.findByIdAndUpdate(student._id, { status: 'suspended' });

      const res = await request(app)
        .put(`/api/users/${student._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' });
      expect(res.status).toBe(200);

      const updated = await User.findById(student._id);
      expect(updated.status).toBe('active');
    });

    test('Admin cannot change own status', async () => {
      const res = await request(app)
        .put(`/api/users/${adminUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' });
      expect(res.status).toBe(400);
    });

    test('Non-admin cannot change user status', async () => {
      const res = await request(app)
        .put(`/api/users/${student._id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'suspended' });
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/users/:id/role (admin)', () => {
    test('Admin can change user role to faculty', async () => {
      // Reset student role first
      await User.findByIdAndUpdate(student._id, { role: 'user' });

      const res = await request(app)
        .put(`/api/users/${student._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'faculty' });
      expect(res.status).toBe(200);

      const updated = await User.findById(student._id);
      expect(updated.role).toBe('faculty');
    });

    test('Role change to faculty sets booking limit to 20', async () => {
      await User.findByIdAndUpdate(student._id, { role: 'user', maxActiveBookings: 5 });

      const res = await request(app)
        .put(`/api/users/${student._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'faculty' });
      expect(res.status).toBe(200);

      const updated = await User.findById(student._id);
      expect(updated.maxActiveBookings).toBe(20);
    });

    test('Role change to staff sets booking limit to 10', async () => {
      const res = await request(app)
        .put(`/api/users/${student._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'staff' });
      expect(res.status).toBe(200);

      const updated = await User.findById(student._id);
      expect(updated.maxActiveBookings).toBe(10);
    });
  });
});
