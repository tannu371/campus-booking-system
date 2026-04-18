const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../config/mailer');
const { welcomeEmail } = require('../utils/emailTemplates');
const { logAudit } = require('../utils/auditLogger');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'campus_booking_secret', {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, department, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password, department, phone });

    await logAudit('USER_REGISTERED', {
      performedBy: user._id,
      targetType: 'user',
      targetId: user._id,
      details: { name, email, department },
      ipAddress: req.clientIp
    });

    // Send welcome email (non-blocking)
    sendEmail(email, 'Welcome to CampusBook! 🏫', welcomeEmail(name)).catch(() => {});

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user is deactivated
    if (user.status === 'deactivated') {
      return res.status(403).json({ message: 'Account has been deactivated. Contact admin.' });
    }

    // Check if suspended and if suspension has expired
    if (user.status === 'suspended') {
      if (user.suspendedUntil && new Date() > user.suspendedUntil) {
        user.status = 'active';
        user.suspendReason = '';
        user.suspendedUntil = null;
        await user.save();
      } else {
        return res.status(403).json({
          message: 'Account is suspended',
          suspendedUntil: user.suspendedUntil,
          reason: user.suspendReason
        });
      }
    }

    if (await user.matchPassword(password)) {
      user.lastLogin = new Date();
      await user.save();

      await logAudit('USER_LOGIN', {
        performedBy: user._id,
        targetType: 'user',
        targetId: user._id,
        details: { email },
        ipAddress: req.clientIp
      });

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = { register, login, getMe };
