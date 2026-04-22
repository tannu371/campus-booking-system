const User = require('../models/User');
const Booking = require('../models/Booking');
const { logAudit } = require('../utils/auditLogger');
const { sanitizeString, sanitizeNumber } = require('../utils/sanitizeQuery');

// @desc    Get all users (admin) - with NoSQL injection protection
// @route   GET /api/users
const getUsers = async (req, res) => {
  try {
    // SECURITY: Sanitize query parameters to prevent NoSQL injection
    const search = sanitizeString(req.query.search);
    const role = sanitizeString(req.query.role, ['user', 'staff', 'faculty', 'admin']);
    const status = sanitizeString(req.query.status, ['active', 'suspended', 'deactivated']);
    const page = sanitizeNumber(req.query.page, { min: 1, default: 1 });
    const limit = sanitizeNumber(req.query.limit, { min: 1, max: 100, default: 30 });

    const filter = {};

    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      // Sanitize search string to prevent ReDoS attacks
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
        { department: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    // Get booking counts for each user
    const usersWithStats = await Promise.all(users.map(async (u) => {
      const bookingCount = await Booking.countDocuments({ user: u._id });
      const activeBookings = await Booking.countDocuments({
        user: u._id,
        status: { $in: ['approved', 'pending'] },
        date: { $gte: new Date() }
      });
      return {
        ...u.toObject(),
        bookingCount,
        activeBookings
      };
    }));

    res.json({
      users: usersWithStats,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile with booking history (admin)
// @route   GET /api/users/:id
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const recentBookings = await Booking.find({ user: req.params.id })
      .populate('room', 'name building')
      .sort({ date: -1 })
      .limit(20);

    const stats = {
      totalBookings: await Booking.countDocuments({ user: req.params.id }),
      activeBookings: await Booking.countDocuments({
        user: req.params.id,
        status: { $in: ['approved', 'pending'] },
        date: { $gte: new Date() }
      }),
      cancelledBookings: await Booking.countDocuments({ user: req.params.id, status: 'cancelled' }),
      noShows: await Booking.countDocuments({
        user: req.params.id,
        status: 'approved',
        checkedIn: false,
        date: { $lt: new Date() }
      })
    };

    res.json({ user, recentBookings, stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user status (suspend/activate) (admin)
// @route   PUT /api/users/:id/status
const updateUserStatus = async (req, res) => {
  try {
    const { status, reason, suspendedUntil } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent self-suspension
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'Cannot change your own status' });
    }

    const previousStatus = user.status;
    user.status = status;
    if (status === 'suspended') {
      user.suspendReason = reason || '';
      user.suspendedUntil = suspendedUntil || null;
    } else {
      user.suspendReason = '';
      user.suspendedUntil = null;
    }
    await user.save();

    const actionMap = {
      suspended: 'USER_SUSPENDED',
      active: 'USER_ACTIVATED',
      deactivated: 'USER_DEACTIVATED'
    };

    await logAudit(actionMap[status] || 'USER_ACTIVATED', {
      performedBy: req.user._id,
      targetType: 'user',
      targetId: user._id,
      details: { previousStatus, newStatus: status, reason },
      ipAddress: req.clientIp
    });

    res.json({
      message: `User ${status}`,
      user: { _id: user._id, name: user.name, email: user.email, status: user.status }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user role (admin)
// @route   PUT /api/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const previousRole = user.role;
    user.role = role;

    // Set appropriate booking limits by role
    if (role === 'admin') user.maxActiveBookings = 50;
    else if (role === 'faculty') user.maxActiveBookings = 20;
    else if (role === 'staff') user.maxActiveBookings = 10;
    else user.maxActiveBookings = 5;

    await user.save();

    await logAudit('USER_ROLE_CHANGED', {
      performedBy: req.user._id,
      targetType: 'user',
      targetId: user._id,
      details: { previousRole, newRole: role },
      ipAddress: req.clientIp
    });

    res.json({ message: `Role updated to ${role}`, user: { _id: user._id, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user statistics (admin)
// @route   GET /api/users/stats
const getUserStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, suspendedUsers, newThisMonth] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'suspended' }),
      User.countDocuments({
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      })
    ]);

    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ totalUsers, activeUsers, suspendedUsers, newThisMonth, usersByRole });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUsers, getUserProfile, updateUserStatus, updateUserRole, getUserStats };
