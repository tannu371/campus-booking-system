const express = require('express');
const router = express.Router();
const {
  getRooms, getRoom, getRoomSchedule, getRoomUtilization,
  createRoom, updateRoom, deleteRoom, getBuildings
} = require('../controllers/roomController');
const { protect, admin } = require('../middleware/auth');
const { adminMutationLimiter } = require('../middleware/rateLimiters');
const { roomValidators } = require('../middleware/requestValidators');

router.get('/buildings', getBuildings);
router.get('/', getRooms);
router.get('/:id', roomValidators.roomIdParam, getRoom);
router.get('/:id/schedule', roomValidators.roomIdParam, getRoomSchedule);
router.get('/:id/utilization', roomValidators.roomIdParam, protect, admin, getRoomUtilization);
router.post('/', protect, admin, adminMutationLimiter, roomValidators.createRoom, createRoom);
router.put('/:id', protect, admin, adminMutationLimiter, roomValidators.updateRoom, updateRoom);
router.delete('/:id', protect, admin, adminMutationLimiter, roomValidators.roomIdParam, deleteRoom);

module.exports = router;
