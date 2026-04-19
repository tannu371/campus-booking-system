/**
 * Priority Calculator
 * Determines booking priority based on user role
 * Lower number = higher priority
 */

const PRIORITY_LEVELS = {
  admin: 1,
  faculty: 2,
  staff: 3,
  user: 4,
  guest: 5
};

/**
 * Calculate priority level from user role
 * @param {string} role - User role
 * @returns {number} Priority level (1-5, lower is higher priority)
 */
const calculatePriority = (role) => {
  return PRIORITY_LEVELS[role] || PRIORITY_LEVELS.user;
};

/**
 * Determine initial booking status based on user and room
 * @param {Object} user - User object with role
 * @param {Object} room - Room object with requiresApproval flag
 * @returns {string} 'pending' or 'approved'
 */
const determineInitialStatus = (user, room) => {
  // Room requires approval
  if (room.requiresApproval) {
    return 'pending';
  }

  // Admins and faculty bypass approval for non-restricted rooms
  if (user.role === 'admin' || user.role === 'faculty') {
    return 'approved';
  }

  return 'approved';
};

/**
 * Find bookings that can be preempted by a higher priority user
 * @param {Array} conflicts - Array of conflicting bookings (populated with user)
 * @param {number} requesterPriority - Priority of the requesting user
 * @returns {Array} Bookings that can be preempted
 */
const findPreemptableBookings = (conflicts, requesterPriority) => {
  return conflicts.filter(booking => {
    const bookingPriority = calculatePriority(booking.user?.role || 'user');
    return requesterPriority < bookingPriority;
  });
};

/**
 * Check if user can override a booking
 * @param {Object} requester - Requesting user
 * @param {Object} existingBooking - Existing booking with user populated
 * @returns {boolean}
 */
const canOverride = (requester, existingBooking) => {
  const requesterPriority = calculatePriority(requester.role);
  const existingPriority = calculatePriority(existingBooking.user?.role || 'user');
  
  // Can override if higher priority (lower number)
  return requesterPriority < existingPriority;
};

/**
 * Get priority label for display
 * @param {number} priority - Priority level
 * @returns {string}
 */
const getPriorityLabel = (priority) => {
  const labels = {
    1: 'Critical',
    2: 'High',
    3: 'Medium',
    4: 'Normal',
    5: 'Low'
  };
  return labels[priority] || 'Normal';
};

module.exports = {
  calculatePriority,
  determineInitialStatus,
  findPreemptableBookings,
  canOverride,
  getPriorityLabel,
  PRIORITY_LEVELS
};
