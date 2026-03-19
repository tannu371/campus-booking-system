const Room = require('../models/Room');

// @desc    Get all rooms
// @route   GET /api/rooms
const getRooms = async (req, res) => {
  try {
    const { type, capacity, building, search } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (building) filter.building = { $regex: building, $options: 'i' };
    if (capacity) filter.capacity = { $gte: parseInt(capacity) };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const rooms = await Room.find(filter).sort({ createdAt: -1 });
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

// @desc    Create a room (admin)
// @route   POST /api/rooms
const createRoom = async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a room (admin)
// @route   PUT /api/rooms/:id
const updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a room (admin)
// @route   DELETE /api/rooms/:id
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json({ message: 'Room removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRooms, getRoom, createRoom, updateRoom, deleteRoom };
