const mongoose = require('mongoose');
const { connectTestDatabase, disconnectTestDatabase } = require('./helpers/testDb');
const lockManager = require('../utils/lockManager');

let dbContext;

beforeAll(async () => {
  dbContext = await connectTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase(dbContext);
  lockManager.shutdown();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
