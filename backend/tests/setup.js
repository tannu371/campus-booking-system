const mongoose = require('mongoose');
const { connectTestDatabase, disconnectTestDatabase } = require('./helpers/testDb');

let dbContext;

beforeAll(async () => {
  dbContext = await connectTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase(dbContext);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
