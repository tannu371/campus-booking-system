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
const { adminMutationLimiter } = require('../middleware/rateLimiters');
const { bookingValidators } = require('../middleware/requestValidators');

router.post('/', protect, bookingValidators.createBooking, createBooking);
router.post('/recurring', protect, bookingValidators.createRecurringBooking, createRecurringBooking);
router.delete('/recurring/:groupId', protect, cancelRecurringBooking);
router.get('/mine', protect, getMyBookings);
router.get('/stats', protect, admin, getBookingStats);
router.get('/room/:roomId', bookingValidators.roomIdParam, getBookingsByRoom);
router.get('/', protect, admin, getAllBookings);
router.post('/override', protect, admin, adminMutationLimiter, bookingValidators.adminOverride, adminOverrideBooking);
router.put('/:id', protect, bookingValidators.updateBooking, updateBooking);
router.put('/:id/status', protect, admin, adminMutationLimiter, bookingValidators.updateBookingStatus, updateBookingStatus);
router.put('/:id/checkin', protect, bookingValidators.bookingIdParam, checkInBooking);
router.delete('/:id', protect, bookingValidators.bookingIdParam, cancelBooking);

module.exports = router;
