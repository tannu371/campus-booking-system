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
  adminOverrideBooking,
  checkInBooking,
  getBookingStats,
  createRecurringBooking,
  cancelRecurringBooking
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/auth');

router.post('/', protect, createBooking);
router.post('/recurring', protect, createRecurringBooking);
router.delete('/recurring/:groupId', protect, cancelRecurringBooking);
router.get('/mine', protect, getMyBookings);
router.get('/stats', protect, admin, getBookingStats);
router.get('/room/:roomId', getBookingsByRoom);
router.get('/', protect, admin, getAllBookings);
router.post('/override', protect, admin, adminOverrideBooking);
router.put('/:id', protect, updateBooking);
router.put('/:id/status', protect, admin, updateBookingStatus);
router.put('/:id/checkin', protect, checkInBooking);
router.delete('/:id', protect, cancelBooking);

module.exports = router;
