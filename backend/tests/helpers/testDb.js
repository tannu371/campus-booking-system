const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const TEST_DB_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/campus-booking-test';

const connectTestDatabase = async () => {
  try {
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    return { mongoServer, mode: 'memory' };
  } catch (error) {
    console.warn(`MongoMemoryServer unavailable (${error.message}). Falling back to ${TEST_DB_URI}`);
    try {
      await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 5000 });
      return { mongoServer: null, mode: 'persistent' };
    } catch (fallbackError) {
      throw new Error(
        `Unable to connect to test database. MongoMemoryServer failed and fallback URI is unreachable: ${TEST_DB_URI}. ` +
        `Start local MongoDB or set TEST_MONGO_URI to a reachable test instance. ` +
        `Original errors: [memory=${error.message}] [fallback=${fallbackError.message}]`
      );
    }
  }
};

const disconnectTestDatabase = async (ctx) => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }

  if (ctx?.mongoServer) {
    await ctx.mongoServer.stop();
  }
};

module.exports = {
  connectTestDatabase,
  disconnectTestDatabase
};
