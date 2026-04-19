const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const { sendEmail } = require('../config/mailer');
const { bookingConfirmationEmail, bookingStatusEmail } = require('../utils/emailTemplates');
const { validateBookingRequest, detectsOverlapWithBuffer, generateConfirmationCode } = require('../utils/bookingValidator');
const { logAudit } = require('../utils/auditLogger');
const lockManager = require('../utils/lockManager');
const IntervalTree = require('../utils/IntervalTree');
const { calculatePriority, determineInitialStatus } = require('../utils/priorityCalculator');
const { expandRecurrenceRule, validateRecurrenceRule, generateRecurrenceGroupId } = require('../utils/recurrenceEngine');
const { calculateAutoReleaseTime } = require('../utils/autoReleaseWorker');

// In-memory interval tree cache: Map<roomId_date, IntervalTree>
const intervalTreeCache = new Map();

const normalizeDateToStartOfDay = (dateValue) => {
  let date;

  // Parse YYYY-MM-DD as local date to avoid timezone shifts.
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateValue);
  }

  date.setHours(0, 0, 0, 0);
  return date;
};

const getDateRangeForDay = (dateValue) => {
  const start = normalizeDateToStartOfDay(dateValue);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const getStatusesThatBlockSlot = (requiresApproval) =>
  requiresApproval ? ['approved'] : ['pending', 'approved'];

const formatConflictDate = (dateValue) =>
  new Date(dateValue).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

// @desc    Create a booking (Enhanced 8-step algorithm)
// @route   POST /api/bookings
const createBooking = async (req, res) => {
  let lock = null;
  
  try {
    const { room, title, date, startTime, endTime, purpose, attendeeCount } = req.body;

    // STEP 1: Input Validation
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Not authorized. Please log in again.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ message: 'User account not found. Please log in again.' });
    }

    const canBook = user.canBook();
    if (!canBook.allowed) {
      return res.status(403).json({ message: `Cannot create booking: ${canBook.reason}`, error: canBook });
    }

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

    // STEP 2: Authorization Check
    const roomDoc = await Room.findById(room);
    if (!roomDoc) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (!roomDoc.isAvailable || !roomDoc.isActive) {
      return res.status(400).json({ message: 'Room is not available for booking', error: 'ROOM_NOT_AVAILABLE' });
    }

    // STEP 3: Buffer Application & Validation
    const validation = validateBookingRequest({ startTime, endTime, date, attendeeCount }, roomDoc);
    if (!validation.valid) {
      return res.status(400).json({ message: 'Validation failed', errors: validation.errors });
    }

    const bookingDate = normalizeDateToStartOfDay(date);
    const { start: dayStart, end: dayEnd } = getDateRangeForDay(date);
    const dateKey = bookingDate.toISOString().split('T')[0];
    const lockKey = `lock:${room}:${dateKey}`;
    const requestId = `${req.user._id}-${Date.now()}`;

    // STEP 4: Acquire Lock
    lock = await lockManager.tryAcquireLock(lockKey, requestId, 5000, 3, 50);
    if (!lock) {
      return res.status(503).json({
        message: 'Unable to acquire booking lock. Please try again.',
        error: 'LOCK_ACQUISITION_FAILED'
      });
    }

    // STEP 5: Conflict Detection (Interval Tree + DB)
    // Always do DB check for safety (interval tree is an optimization for future)
    const statusesToBlock = getStatusesThatBlockSlot(roomDoc.requiresApproval);
    const existingBookings = await Booking.find({
      room,
      date: { $gte: dayStart, $lt: dayEnd },
      status: { $in: statusesToBlock }
    });

    const conflicts = existingBookings.filter(existing =>
      detectsOverlapWithBuffer(existing.startTime, existing.endTime, startTime, endTime, roomDoc.bufferMinutes || 0)
    );
    
    if (conflicts.length > 0) {
      lockManager.releaseLock(lock);
      
      // Find alternative rooms
      const alternativeRooms = await findAlternativeRooms(room, attendeeCount, roomDoc.type, date, startTime, endTime);

      return res.status(409).json({
        message: `This room is already booked on ${formatConflictDate(bookingDate)} between ${startTime} and ${endTime}. Please select a different time.`,
        error: 'BOOKING_CONFLICT',
        conflicting_bookings: conflicts.map(c => ({
          id: c._id,
          title: c.title,
          date: c.date,
          startTime: c.startTime,
          endTime: c.endTime,
          status: c.status
        })),
        buffer_minutes: roomDoc.bufferMinutes || 0,
        alternative_rooms: alternativeRooms
      });
    }

    // STEP 6: Atomic Insert with Conflict Guard
    const initialStatus = determineInitialStatus(user, roomDoc);
    const confirmationCode = generateConfirmationCode();
    const priorityLevel = calculatePriority(user.role);
    const autoReleaseAt = initialStatus === 'approved' 
      ? calculateAutoReleaseTime(bookingDate, startTime, 15)
      : null;

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
      confirmationCode,
      priorityLevel,
      autoReleaseAt
    });

    // STEP 7: Release Lock & Post-Processing
    // Update interval tree cache (optional optimization for future)
    const cacheKey = `${room}_${dateKey}`;
    let tree = intervalTreeCache.get(cacheKey);
    if (!tree) {
      tree = new IntervalTree();
      intervalTreeCache.set(cacheKey, tree);
    }
    tree.insert(startTime, endTime, booking._id.toString());
    
    lockManager.releaseLock(lock);
    lock = null;

    const populated = await booking.populate(['room', 'user']);

    // STEP 8: Audit & Notifications
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
        confirmationCode,
        priorityLevel,
        autoReleaseAt
      },
      ipAddress: req.clientIp
    });

    sendEmail(
      req.user.email,
      initialStatus === 'pending'
        ? `Booking Submitted: ${title} 📋`
        : `Booking Confirmed: ${title} 📅`,
      bookingConfirmationEmail(booking, roomDoc, req.user)
    ).catch(() => {});

    res.status(201).json(populated);
  } catch (error) {
    // Ensure lock is released on error
    if (lock) {
      lockManager.releaseLock(lock);
    }
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

    const booking = await Booking.findById(req.params.id).populate('room');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const previousStatus = booking.status;

    // If approving, ensure no approved booking conflicts in same slot
    if (status === 'approved' && previousStatus !== 'approved') {
      const roomDoc = booking.room;
      const { start: dayStart, end: dayEnd } = getDateRangeForDay(booking.date);

      const approvedSameDay = await Booking.find({
        _id: { $ne: booking._id },
        room: roomDoc._id,
        date: { $gte: dayStart, $lt: dayEnd },
        status: 'approved'
      }).select('startTime endTime');

      const hasConflict = approvedSameDay.some(existing =>
        detectsOverlapWithBuffer(
          existing.startTime,
          existing.endTime,
          booking.startTime,
          booking.endTime,
          roomDoc.bufferMinutes || 0
        )
      );

      if (hasConflict) {
        return res.status(409).json({
          message: 'Cannot approve booking: time slot conflicts with an already approved booking.',
          error: 'APPROVAL_CONFLICT'
        });
      }
    }

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
    const booking = await Booking.findById(req.params.id).populate(['room', 'user']);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved bookings can be checked in' });
    }

    // Check-in window validation (strict - only within the booked time window)
    const now = new Date();
    const startDateTime = new Date(booking.date);
    const [startH, startM] = booking.startTime.split(':').map(Number);
    startDateTime.setHours(startH, startM, 0, 0);

    const endDateTime = new Date(booking.date);
    const [endH, endM] = booking.endTime.split(':').map(Number);
    endDateTime.setHours(endH, endM, 0, 0);

    if (now < startDateTime) {
      return res.status(400).json({
        message: 'Check-in is only allowed during your booked time slot.',
        error: 'CHECK_IN_TOO_EARLY',
        startsAt: startDateTime
      });
    }

    if (now > endDateTime) {
      return res.status(400).json({
        message: 'Check-in window has ended for this booking.',
        error: 'CHECK_IN_TOO_LATE',
        endsAt: endDateTime
      });
    }

    // Atomic check-in to prevent race with auto-release
    const updated = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        status: 'approved',
        checkedIn: false
      },
      {
        $set: {
          checkedIn: true,
          checkInTime: now
        }
      },
      { new: true }
    ).populate(['room', 'user']);

    if (!updated) {
      // Check if already checked in (idempotent behavior)
      if (booking.checkedIn) {
        return res.json(booking); // Return existing booking, already checked in
      }
      
      return res.status(400).json({
        message: 'Booking status changed, cannot check in',
        error: 'CHECK_IN_FAILED'
      });
    }

    await logAudit('BOOKING_CHECKED_IN', {
      performedBy: req.user._id,
      targetType: 'booking',
      targetId: booking._id,
      details: { checkInTime: now },
      ipAddress: req.clientIp
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create recurring booking
// @route   POST /api/bookings/recurring
const createRecurringBooking = async (req, res) => {
  try {
    const { room, title, date, startTime, endTime, purpose, attendeeCount, recurrenceRule } = req.body;

    // Validate recurrence rule
    const ruleValidation = validateRecurrenceRule(recurrenceRule);
    if (!ruleValidation.valid) {
      return res.status(400).json({
        message: 'Invalid recurrence rule',
        error: ruleValidation.error
      });
    }

    const user = await User.findById(req.user._id);
    const roomDoc = await Room.findById(room);
    
    if (!roomDoc) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Expand recurrence rule
    const firstStart = new Date(date);
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    firstStart.setHours(startH, startM, 0, 0);
    
    const firstEnd = new Date(date);
    firstEnd.setHours(endH, endM, 0, 0);

    const occurrences = expandRecurrenceRule(recurrenceRule, firstStart, firstEnd);

    if (occurrences.length === 0) {
      return res.status(400).json({ message: 'No occurrences generated from recurrence rule' });
    }

    // Generate group ID
    const groupId = generateRecurrenceGroupId();
    const conflicts = [];
    for (let i = 0; i < occurrences.length; i++) {
      const occurrence = occurrences[i];
      const occDate = normalizeDateToStartOfDay(occurrence.start);
      const { start: occDayStart, end: occDayEnd } = getDateRangeForDay(occDate);

      const statusesToBlock = getStatusesThatBlockSlot(roomDoc.requiresApproval);
      const existingBookings = await Booking.find({
        room,
        date: { $gte: occDayStart, $lt: occDayEnd },
        status: { $in: statusesToBlock }
      });

      const conflictingBookings = existingBookings.filter(existing =>
        detectsOverlapWithBuffer(existing.startTime, existing.endTime, startTime, endTime, roomDoc.bufferMinutes || 0)
      );

      if (conflictingBookings.length > 0) {
        conflicts.push({
          index: i,
          date: occDate,
          requestedStartTime: startTime,
          requestedEndTime: endTime,
          conflictsWith: conflictingBookings.map(conflict => ({
            id: conflict._id,
            title: conflict.title,
            date: conflict.date,
            startTime: conflict.startTime,
            endTime: conflict.endTime,
            status: conflict.status
          }))
        });
      }
    }

    if (conflicts.length > 0) {
      return res.status(409).json({
        message: `Recurring booking has conflicts on ${conflicts.length} occurrence(s). No bookings were created.`,
        error: 'RECURRING_BOOKING_CONFLICT',
        buffer_minutes: roomDoc.bufferMinutes || 0,
        conflict_occurrences: conflicts.map(conflict => ({
          index: conflict.index,
          date: conflict.date,
          dateLabel: formatConflictDate(conflict.date),
          requestedStartTime: conflict.requestedStartTime,
          requestedEndTime: conflict.requestedEndTime,
          conflictsWith: conflict.conflictsWith
        }))
      });
    }

    const createdBookings = [];
    for (let i = 0; i < occurrences.length; i++) {
      const occurrence = occurrences[i];
      const occDate = normalizeDateToStartOfDay(occurrence.start);
      const initialStatus = determineInitialStatus(user, roomDoc);
      const confirmationCode = generateConfirmationCode();
      const priorityLevel = calculatePriority(user.role);
      const autoReleaseAt = initialStatus === 'approved'
        ? calculateAutoReleaseTime(occDate, startTime, 15)
        : null;

      const booking = await Booking.create({
        room,
        user: req.user._id,
        title,
        date: occDate,
        startTime,
        endTime,
        purpose,
        attendeeCount: attendeeCount || null,
        status: initialStatus,
        confirmationCode,
        priorityLevel,
        autoReleaseAt,
        recurrenceRule,
        recurrenceGroupId: groupId,
        recurrenceIndex: i,
        isRecurringParent: i === 0
      });

      createdBookings.push(booking);
    }

    await logAudit('RECURRING_BOOKING_CREATED', {
      performedBy: req.user._id,
      targetType: 'booking',
      targetId: groupId,
      details: {
        room: roomDoc.name,
        recurrenceRule,
        totalOccurrences: occurrences.length,
        created: createdBookings.length,
        conflicts: 0
      },
      ipAddress: req.clientIp
    });

    res.status(201).json({
      message: 'Recurring booking created',
      groupId,
      created: createdBookings.length,
      conflicts: 0,
      bookings: createdBookings
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel recurring booking
// @route   DELETE /api/bookings/recurring/:groupId
const cancelRecurringBooking = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { scope = 'ALL', fromDate } = req.body; // Scope: THIS_ONLY, THIS_AND_FUTURE, ALL

    const bookings = await Booking.find({
      recurrenceGroupId: groupId,
      status: { $in: ['pending', 'approved'] }
    });

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this recurrence group' });
    }

    // Check authorization
    const firstBooking = bookings[0];
    if (firstBooking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let bookingsToCancel = [];

    switch (scope) {
      case 'THIS_ONLY':
        if (!fromDate) {
          return res.status(400).json({ message: 'fromDate required for THIS_ONLY scope' });
        }
        bookingsToCancel = bookings.filter(b => 
          b.date.toISOString().split('T')[0] === new Date(fromDate).toISOString().split('T')[0]
        );
        break;

      case 'THIS_AND_FUTURE':
        if (!fromDate) {
          return res.status(400).json({ message: 'fromDate required for THIS_AND_FUTURE scope' });
        }
        bookingsToCancel = bookings.filter(b => b.date >= new Date(fromDate));
        break;

      case 'ALL':
      default:
        bookingsToCancel = bookings;
        break;
    }

    // Cancel bookings
    const cancelledIds = [];
    for (const booking of bookingsToCancel) {
      booking.status = 'cancelled';
      booking.cancelReason = `Recurring booking cancelled (${scope})`;
      booking.cancelledBy = req.user._id;
      booking.cancelledAt = new Date();
      await booking.save();
      cancelledIds.push(booking._id);
    }

    await logAudit('RECURRING_BOOKING_CANCELLED', {
      performedBy: req.user._id,
      targetType: 'booking',
      targetId: groupId,
      details: {
        scope,
        cancelled: cancelledIds.length,
        fromDate
      },
      ipAddress: req.clientIp
    });

    res.json({
      message: 'Recurring booking cancelled',
      scope,
      cancelled: cancelledIds.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper: Find alternative rooms
const findAlternativeRooms = async (excludeRoomId, attendeeCount, roomType, date, startTime, endTime) => {
  const { start: dayStart, end: dayEnd } = getDateRangeForDay(date);
  const rooms = await Room.find({
    _id: { $ne: excludeRoomId },
    isAvailable: true,
    isActive: true,
    capacity: { $gte: attendeeCount || 1 },
    type: roomType
  }).limit(5).select('name building floor capacity type requiresApproval');

  const alternatives = [];

  for (const room of rooms) {
    const statusesToBlock = getStatusesThatBlockSlot(room.requiresApproval);
    const existingBookings = await Booking.find({
      room: room._id,
      date: { $gte: dayStart, $lt: dayEnd },
      status: { $in: statusesToBlock }
    });

    const hasConflict = existingBookings.some(existing =>
      detectsOverlapWithBuffer(existing.startTime, existing.endTime, startTime, endTime, room.bufferMinutes || 0)
    );

    if (!hasConflict) {
      alternatives.push(room);
    }
  }

  return alternatives.slice(0, 3);
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
  getBookingStats,
  createRecurringBooking,
  cancelRecurringBooking
};
