const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { attachIp } = require('./utils/auditLogger');
const { startAutoReleaseWorker } = require('./utils/autoReleaseWorker');

dotenv.config();

// Security: Fail fast if JWT_SECRET is not configured
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is required');
  console.error('   Set JWT_SECRET in your .env file to a strong random value');
  process.exit(1);
}

const app = express();

// Connect to MongoDB and auto-seed if empty
const startDB = async () => {
  await connectDB();

  const autoSeedOnEmpty = process.env.AUTO_SEED_ON_EMPTY === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (autoSeedOnEmpty) {
    // SECURITY: Prevent auto-seeding in production with default passwords
    if (isProduction) {
      const hasCustomPasswords = 
        process.env.SEED_ADMIN_PASSWORD && 
        process.env.SEED_FACULTY_PASSWORD && 
        process.env.SEED_USER_PASSWORD && 
        process.env.SEED_STAFF_PASSWORD &&
        !process.env.SEED_ADMIN_PASSWORD.includes('CHANGE_ME') &&
        !process.env.SEED_FACULTY_PASSWORD.includes('CHANGE_ME') &&
        !process.env.SEED_USER_PASSWORD.includes('CHANGE_ME') &&
        !process.env.SEED_STAFF_PASSWORD.includes('CHANGE_ME');

      if (!hasCustomPasswords) {
        console.error('❌ FATAL: Cannot auto-seed in production without custom SEED_*_PASSWORD variables');
        console.error('   Set SEED_ADMIN_PASSWORD, SEED_FACULTY_PASSWORD, SEED_USER_PASSWORD, SEED_STAFF_PASSWORD');
        console.error('   Or set AUTO_SEED_ON_EMPTY=false for production');
        process.exit(1);
      }
    }

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
  }
  
  // Start auto-release worker after DB connection
  startAutoReleaseWorker();
};
startDB();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self' http://localhost:5001 http://localhost:5173; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  next();
});
app.use(express.json());
app.use(cookieParser());
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
