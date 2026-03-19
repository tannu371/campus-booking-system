const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingsByRoom,
  updateBooking,
  cancelBooking,
  updateBookingStatus,
  getBookingStats
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/auth');

router.post('/', protect, createBooking);
router.get('/mine', protect, getMyBookings);
router.get('/stats', protect, admin, getBookingStats);
router.get('/room/:roomId', getBookingsByRoom);
router.get('/', protect, admin, getAllBookings);
router.put('/:id', protect, updateBooking);
router.put('/:id/status', protect, admin, updateBookingStatus);
router.delete('/:id', protect, cancelBooking);

module.exports = router;
