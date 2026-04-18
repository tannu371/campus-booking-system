const mongoose = require('mongoose');

let mongoServer;

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-booking';
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`⚠️  MongoDB connection failed (${error.message}). Trying in-memory server...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const memUri = mongoServer.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`✅ MongoDB in-memory connected: ${conn.connection.host}`);
      console.log(`ℹ️  Data will NOT persist between restarts. Install MongoDB locally for persistence.`);
    } catch (memError) {
      console.error(`❌ MongoDB connection error: ${memError.message}`);
      process.exit(1);
    }
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  if (mongoServer) await mongoServer.stop();
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = connectDB;
