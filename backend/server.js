const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { attachIp } = require('./utils/auditLogger');

dotenv.config();

const app = express();

// Connect to MongoDB and auto-seed if empty
const startDB = async () => {
  await connectDB();
  // Auto-seed if database is empty (e.g. in-memory server)
  const User = require('./models/User');
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('📦 Empty database detected. Auto-seeding...');
    try {
      await require('./seedData')();
      console.log('✅ Auto-seed complete!');
    } catch (err) {
      console.error('⚠️ Auto-seed failed:', err.message);
    }
  }
};
startDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(attachIp);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
