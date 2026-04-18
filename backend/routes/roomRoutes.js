const express = require('express');
const router = express.Router();
const {
  getRooms, getRoom, getRoomSchedule, getRoomUtilization,
  createRoom, updateRoom, deleteRoom, getBuildings
} = require('../controllers/roomController');
const { protect, admin } = require('../middleware/auth');

router.get('/buildings', getBuildings);
router.get('/', getRooms);
router.get('/:id', getRoom);
router.get('/:id/schedule', getRoomSchedule);
router.get('/:id/utilization', protect, admin, getRoomUtilization);
router.post('/', protect, admin, createRoom);
router.put('/:id', protect, admin, updateRoom);
router.delete('/:id', protect, admin, deleteRoom);

module.exports = router;
