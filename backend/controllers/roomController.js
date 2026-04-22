const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { logAudit } = require('../utils/auditLogger');
const { sanitizeString, sanitizeNumber } = require('../utils/sanitizeQuery');

// @desc    Get all rooms - with NoSQL injection protection
// @route   GET /api/rooms
const getRooms = async (req, res) => {
  try {
    // SECURITY: Sanitize query parameters to prevent NoSQL injection
    const type = sanitizeString(req.query.type, ['classroom', 'lab', 'seminar_hall', 'conference_room', 'meeting_room']);
    const capacity = sanitizeNumber(req.query.capacity, { min: 1 });
    const building = sanitizeString(req.query.building);
    const search = sanitizeString(req.query.search);
    
    const filter = { isActive: true };

    if (type) filter.type = type;
    if (building) {
      // Sanitize regex input to prevent ReDoS
      const sanitizedBuilding = building.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.building = { $regex: sanitizedBuilding, $options: 'i' };
    }
    if (capacity) filter.capacity = { $gte: capacity };
    if (search) {
      // Sanitize regex input to prevent ReDoS
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { building: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const rooms = await Room.find(filter).sort({ building: 1, floor: 1, name: 1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
const getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get room schedule for a specific date
// @route   GET /api/rooms/:id/schedule
const getRoomSchedule = async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date ? new Date(date) : new Date();

    const bookings = await Booking.find({
      room: req.params.id,
      date: queryDate,
      status: { $in: ['approved', 'pending'] }
    }).populate('user', 'name email').sort({ startTime: 1 });

    const room = await Room.findById(req.params.id);

    res.json({
      room: room ? { name: room.name, operatingHoursStart: room.operatingHoursStart, operatingHoursEnd: room.operatingHoursEnd } : null,
      date: queryDate,
      bookings
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get room utilization stats
// @route   GET /api/rooms/:id/utilization
const getRoomUtilization = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const bookings = await Booking.find({
      room: req.params.id,
      date: { $gte: startDate },
      status: { $in: ['approved', 'completed'] }
    });

    // Calculate utilization
    const operatingMinutesPerDay = (() => {
      const [sh, sm] = (room.operatingHoursStart || '07:00').split(':').map(Number);
      const [eh, em] = (room.operatingHoursEnd || '22:00').split(':').map(Number);
      return (eh * 60 + em) - (sh * 60 + sm);
    })();

    let totalBookedMinutes = 0;
    bookings.forEach(b => {
      const [sh, sm] = b.startTime.split(':').map(Number);
      const [eh, em] = b.endTime.split(':').map(Number);
      totalBookedMinutes += (eh * 60 + em) - (sh * 60 + sm);
    });

    const totalAvailableMinutes = operatingMinutesPerDay * parseInt(days);
    const utilizationRate = totalAvailableMinutes > 0
      ? ((totalBookedMinutes / totalAvailableMinutes) * 100).toFixed(1)
      : '0.0';

    res.json({
      room: { name: room.name, building: room.building },
      period_days: parseInt(days),
      total_bookings: bookings.length,
      total_booked_hours: (totalBookedMinutes / 60).toFixed(1),
      utilization_percentage: parseFloat(utilizationRate),
      avg_bookings_per_day: (bookings.length / parseInt(days)).toFixed(1)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a room (admin) - with field whitelisting
// @route   POST /api/rooms
const createRoom = async (req, res) => {
  try {
    // SECURITY: Whitelist fields for room creation
    const allowedFields = [
      'name', 'type', 'capacity', 'building', 'floor', 'amenities',
      'description', 'isAvailable', 'operatingHoursStart', 'operatingHoursEnd',
      'bufferMinutes', 'requiresApproval', 'internalNotes'
    ];
    
    const roomData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        roomData[field] = req.body[field];
      }
    });

    // Validate required fields
    if (!roomData.name || !roomData.type || !roomData.capacity || !roomData.building) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['name', 'type', 'capacity', 'building']
      });
    }

    const room = await Room.create(roomData);

    await logAudit('ROOM_CREATED', {
      performedBy: req.user._id,
      targetType: 'room',
      targetId: room._id,
      details: { name: room.name, building: room.building, type: room.type, capacity: room.capacity },
      ipAddress: req.clientIp
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a room (admin) - with field whitelisting
// @route   PUT /api/rooms/:id
const updateRoom = async (req, res) => {
  try {
    const before = await Room.findById(req.params.id);
    if (!before) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // SECURITY: Whitelist mutable fields to prevent mass-assignment
    const allowedFields = [
      'name', 'type', 'capacity', 'building', 'floor', 'amenities',
      'description', 'isAvailable', 'operatingHoursStart', 'operatingHoursEnd',
      'bufferMinutes', 'requiresApproval', 'internalNotes'
    ];
    
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Reject if trying to update protected fields
    const protectedFields = ['isActive', '_id', 'createdAt', 'updatedAt'];
    const attemptedProtectedFields = protectedFields.filter(field => req.body[field] !== undefined);
    
    if (attemptedProtectedFields.length > 0) {
      return res.status(400).json({
        message: 'Cannot update protected fields',
        error: 'PROTECTED_FIELDS',
        attemptedFields: attemptedProtectedFields,
        hint: 'Use DELETE endpoint to deactivate rooms'
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'No valid fields to update',
        allowedFields
      });
    }

    // Apply updates
    Object.assign(before, updates);
    await before.save();

    await logAudit('ROOM_UPDATED', {
      performedBy: req.user._id,
      targetType: 'room',
      targetId: before._id,
      details: { changes: updates },
      ipAddress: req.clientIp
    });

    res.json(before);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Soft-delete a room (admin)
// @route   DELETE /api/rooms/:id
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Soft delete
    room.isActive = false;
    room.isAvailable = false;
    await room.save();

    // Count affected future bookings
    const affectedBookings = await Booking.countDocuments({
      room: req.params.id,
      status: { $in: ['approved', 'pending'] },
      date: { $gte: new Date() }
    });

    await logAudit('ROOM_DEACTIVATED', {
      performedBy: req.user._id,
      targetType: 'room',
      targetId: room._id,
      details: { name: room.name, affectedBookings, reason: req.body?.reason || '' },
      ipAddress: req.clientIp
    });

    res.json({ message: 'Room deactivated', affectedBookings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all unique buildings (for filters)
// @route   GET /api/rooms/buildings
const getBuildings = async (req, res) => {
  try {
    const buildings = await Room.distinct('building', { isActive: true });
    res.json(buildings.sort());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRooms, getRoom, getRoomSchedule, getRoomUtilization, createRoom, updateRoom, deleteRoom, getBuildings };
