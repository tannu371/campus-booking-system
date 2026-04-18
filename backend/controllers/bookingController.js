const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const { sendEmail } = require('../config/mailer');
const { bookingConfirmationEmail, bookingStatusEmail } = require('../utils/emailTemplates');
const { validateBookingRequest, detectsOverlapWithBuffer, generateConfirmationCode } = require('../utils/bookingValidator');
const { logAudit } = require('../utils/auditLogger');

// @desc    Create a booking
// @route   POST /api/bookings
const createBooking = async (req, res) => {
  try {
    const { room, title, date, startTime, endTime, purpose, attendeeCount } = req.body;

    // 1. Check user status
    const user = await User.findById(req.user._id);
    const canBook = user.canBook();
    if (!canBook.allowed) {
      return res.status(403).json({ message: `Cannot create booking: ${canBook.reason}`, error: canBook });
    }

    // 2. Check user booking limits
    const activeBookings = await Booking.countDocuments({
      user: req.user._id,
      status: { $in: ['pending', 'approved'] },
      date: { $gte: new Date() }
    });

    if (activeBookings >= (user.maxActiveBookings || 5)) {
      return res.status(400).json({
        message: `You have reached your maximum of ${user.maxActiveBookings || 5} active bookings`,
        error: 'BOOKING_LIMIT_EXCEEDED',
        current: activeBookings,
        maximum: user.maxActiveBookings || 5
      });
    }

    // 3. Get room and validate
    const roomDoc = await Room.findById(room);
    if (!roomDoc) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (!roomDoc.isAvailable || !roomDoc.isActive) {
      return res.status(400).json({ message: 'Room is not available for booking', error: 'ROOM_NOT_AVAILABLE' });
    }

    // 4. Run all validations
    const validation = validateBookingRequest({ startTime, endTime, date, attendeeCount }, roomDoc);
    if (!validation.valid) {
      return res.status(400).json({ message: 'Validation failed', errors: validation.errors });
    }

    // 5. Check for conflicts (including buffer time)
    const bookingDate = new Date(date);
    const existingBookings = await Booking.find({
      room,
      date: bookingDate,
      status: { $in: ['pending', 'approved'] }
    });

    const conflicts = existingBookings.filter(existing =>
      detectsOverlapWithBuffer(existing.startTime, existing.endTime, startTime, endTime, roomDoc.bufferMinutes || 0)
    );

    if (conflicts.length > 0) {
      // Find alternative rooms
      const alternativeRooms = await Room.find({
        _id: { $ne: room },
        isAvailable: true,
        isActive: true,
        capacity: { $gte: attendeeCount || 1 }
      }).limit(3).select('name building floor capacity type');

      return res.status(409).json({
        message: 'Time slot conflicts with an existing booking',
        error: 'BOOKING_CONFLICT',
        conflicting_bookings: conflicts.map(c => ({
          id: c._id,
          title: c.title,
          startTime: c.startTime,
          endTime: c.endTime,
          status: c.status
        })),
        buffer_minutes: roomDoc.bufferMinutes || 0,
        alternative_rooms: alternativeRooms
      });
    }

    // 6. Determine initial status
    const initialStatus = roomDoc.requiresApproval ? 'pending' : 'approved';
    const confirmationCode = generateConfirmationCode();

    // 7. Create the booking
    const booking = await Booking.create({
      room,
      user: req.user._id,
      title,
      date: bookingDate,
      startTime,
      endTime,
      purpose,
      attendeeCount: attendeeCount || null,
      status: initialStatus,
      confirmationCode
    });

    const populated = await booking.populate(['room', 'user']);

    // 8. Audit log
    await logAudit('BOOKING_CREATED', {
      performedBy: req.user._id,
      targetType: 'booking',
      targetId: booking._id,
      details: {
        room: roomDoc.name,
        date: bookingDate,
        startTime,
        endTime,
        status: initialStatus,
        confirmationCode
      },
      ipAddress: req.clientIp
    });

    // 9. Send confirmation email (non-blocking)
    sendEmail(
      req.user.email,
      initialStatus === 'pending'
        ? `Booking Submitted: ${title} 📋`
        : `Booking Confirmed: ${title} 📅`,
      bookingConfirmationEmail(booking, roomDoc, req.user)
    ).catch(() => {});

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user's bookings
// @route   GET /api/bookings/mine
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('room')
      .sort({ date: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all bookings (admin)
// @route   GET /api/bookings
const getAllBookings = async (req, res) => {
  try {
    const { status, room, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (room) filter.room = room;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate(['room', 'user'])
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(filter)
    ]);

    res.json({
      bookings,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings for a specific room
// @route   GET /api/bookings/room/:roomId
const getBookingsByRoom = async (req, res) => {
  try {
    const bookings = await Booking.find({
      room: req.params.roomId,
      status: { $in: ['pending', 'approved'] }
    }).populate('user');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a booking
// @route   PUT /api/bookings/:id
const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only the booking owner can modify
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const before = { ...booking.toObject() };
    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate(['room', 'user']);

    await logAudit('BOOKING_UPDATED', {
      performedBy: req.user._id,
      targetType: 'booking',
      targetId: booking._id,
      details: { before, after: req.body },
      ipAddress: req.clientIp
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel a booking
// @route   DELETE /api/bookings/:id
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(['room', 'user']);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    booking.status = 'cancelled';
    booking.cancelReason = req.body?.reason || '';
    booking.cancelledBy = req.user._id;
    await booking.save();

    await logAudit('BOOKING_CANCELLED', {
      performedBy: req.user._id,
      targetType: 'booking',
      targetId: booking._id,
      details: {
        room: booking.room?.name,
        date: booking.date,
        cancelReason: booking.cancelReason,
        cancelledBySelf: booking.user._id.toString() === req.user._id.toString()
      },
      ipAddress: req.clientIp
    });

    // Send cancellation email (non-blocking)
    const bookingUser = booking.user;
    if (bookingUser && bookingUser.email) {
      sendEmail(
        bookingUser.email,
        `Booking Cancelled: ${booking.title}`,
        bookingStatusEmail(booking, booking.room || {}, bookingUser, 'cancelled')
      ).catch(() => {});
    }

    res.json({ message: 'Booking cancelled', confirmationCode: booking.confirmationCode });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update booking status (admin)
// @route   PUT /api/bookings/:id/status
const updateBookingStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const previousStatus = booking.status;
    booking.status = status;
    if (reason) booking.cancelReason = reason;
    await booking.save();

    const populated = await booking.populate(['room', 'user']);

    const actionMap = {
      approved: 'BOOKING_APPROVED',
      rejected: 'BOOKING_REJECTED',
      cancelled: 'BOOKING_CANCELLED'
    };

    await logAudit(actionMap[status] || 'BOOKING_UPDATED', {
      performedBy: req.user._id,
      targetType: 'booking',
      targetId: booking._id,
      details: { previousStatus, newStatus: status, reason },
      ipAddress: req.clientIp
    });

    // Send status update email (non-blocking)
    if (populated.user && populated.user.email) {
      sendEmail(
        populated.user.email,
        `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}: ${booking.title}`,
        bookingStatusEmail(booking, populated.room || {}, populated.user, status)
      ).catch(() => {});
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin override — cancel existing booking and create a new one
// @route   POST /api/bookings/override
const adminOverrideBooking = async (req, res) => {
  try {
    const { existingBookingId, title, date, startTime, endTime, purpose, overrideReason } = req.body;

    if (!overrideReason) {
      return res.status(400).json({ message: 'Override reason is required' });
    }

    const existingBooking = await Booking.findById(existingBookingId).populate(['room', 'user']);
    if (!existingBooking) {
      return res.status(404).json({ message: 'Existing booking not found' });
    }

    // Cancel the existing booking
    existingBooking.status = 'cancelled';
    existingBooking.cancelReason = `Admin override: ${overrideReason}`;
    existingBooking.cancelledBy = req.user._id;
    await existingBooking.save();

    // Create the new booking
    const confirmationCode = generateConfirmationCode();
    const newBooking = await Booking.create({
      room: existingBooking.room._id,
      user: req.user._id,
      title,
      date: new Date(date || existingBooking.date),
      startTime: startTime || existingBooking.startTime,
      endTime: endTime || existingBooking.endTime,
      purpose,
      status: 'approved',
      confirmationCode,
      adminOverride: true,
      overrideReason
    });

    await logAudit('ADMIN_OVERRIDE', {
      performedBy: req.user._id,
      targetType: 'booking',
      targetId: newBooking._id,
      details: {
        cancelledBookingId: existingBookingId,
        cancelledBookingUser: existingBooking.user?.name,
        overrideReason,
        newBookingId: newBooking._id
      },
      ipAddress: req.clientIp
    });

    // Notify displaced user
    if (existingBooking.user?.email) {
      sendEmail(
        existingBooking.user.email,
        `Booking Override Notice: ${existingBooking.title}`,
        bookingStatusEmail(existingBooking, existingBooking.room || {}, existingBooking.user, 'cancelled')
      ).catch(() => {});
    }

    const populated = await newBooking.populate(['room', 'user']);
    res.status(201).json({
      message: 'Override successful',
      cancelledBooking: existingBookingId,
      newBooking: populated
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check in to a booking
// @route   PUT /api/bookings/:id/checkin
const checkInBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved bookings can be checked in' });
    }

    booking.checkedIn = true;
    booking.checkInTime = new Date();
    await booking.save();

    await logAudit('BOOKING_CHECKED_IN', {
      performedBy: req.user._id,
      targetType: 'booking',
      targetId: booking._id,
      details: { checkInTime: booking.checkInTime },
      ipAddress: req.clientIp
    });

    const populated = await booking.populate(['room', 'user']);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get booking stats (admin)
// @route   GET /api/bookings/stats
const getBookingStats = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const [
      totalBookings,
      pendingBookings,
      approvedBookings,
      cancelledBookings,
      rejectedBookings,
      totalRooms,
      totalUsers,
      recentBookings
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'approved' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.countDocuments({ status: 'rejected' }),
      Room.countDocuments({ isActive: true }),
      User.countDocuments({ status: 'active' }),
      Booking.countDocuments({ createdAt: { $gte: startDate } })
    ]);

    // Bookings per room
    const bookingsPerRoom = await Booking.aggregate([
      { $match: { status: { $in: ['pending', 'approved'] } } },
      { $group: { _id: '$room', count: { $sum: 1 } } },
      { $lookup: { from: 'rooms', localField: '_id', foreignField: '_id', as: 'room' } },
      { $unwind: '$room' },
      { $project: { roomName: '$room.name', building: '$room.building', count: 1 } },
      { $sort: { count: -1 } }
    ]);

    // Bookings by type/day for trend
    const bookingTrend = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayBookings = await Booking.countDocuments({
      date: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['approved', 'pending'] }
    });

    // Checked-in stats
    const checkedInToday = await Booking.countDocuments({
      date: { $gte: todayStart, $lte: todayEnd },
      checkedIn: true
    });

    // No-show count (past approved bookings that weren't checked in)
    const noShowCount = await Booking.countDocuments({
      status: 'approved',
      date: { $lt: todayStart },
      checkedIn: false,
      createdAt: { $gte: startDate }
    });

    res.json({
      totalBookings,
      pendingBookings,
      approvedBookings,
      cancelledBookings,
      rejectedBookings,
      totalRooms,
      totalUsers,
      recentBookings,
      todayBookings,
      checkedInToday,
      noShowCount,
      noShowRate: recentBookings > 0 ? ((noShowCount / recentBookings) * 100).toFixed(1) : '0.0',
      bookingsPerRoom,
      bookingTrend
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingsByRoom,
  updateBooking,
  cancelBooking,
  updateBookingStatus,
  adminOverrideBooking,
  checkInBooking,
  getBookingStats
};
