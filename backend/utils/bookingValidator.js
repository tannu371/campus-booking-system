/**
 * Booking Validation Utilities
 * Pure functions for validating booking requests.
 * Aligned with testing.md specifications.
 */

const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 480; // 8 hours
const MAX_ADVANCE_DAYS = 30;

/**
 * Validate that end time is after start time
 */
const validateTimeOrder = (startTime, endTime) => {
  if (!startTime) {
    return { valid: false, error: 'MISSING_START_TIME', message: 'Start time is required' };
  }
  if (!endTime) {
    return { valid: false, error: 'MISSING_END_TIME', message: 'End time is required' };
  }

  if (endTime <= startTime) {
    return { valid: false, error: 'END_BEFORE_START', message: 'End time must be after start time' };
  }

  return { valid: true };
};

/**
 * Validate booking duration is within acceptable range
 */
const validateDuration = (startTime, endTime, minMinutes = MIN_DURATION_MINUTES, maxMinutes = MAX_DURATION_MINUTES) => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

  if (durationMinutes < minMinutes) {
    return {
      valid: false,
      error: 'DURATION_TOO_SHORT',
      message: `Minimum booking duration is ${minMinutes} minutes`,
      actual_duration_minutes: durationMinutes,
      minimum_duration_minutes: minMinutes
    };
  }

  if (durationMinutes > maxMinutes) {
    return {
      valid: false,
      error: 'DURATION_TOO_LONG',
      message: `Maximum booking duration is ${maxMinutes / 60} hours`,
      actual_duration_minutes: durationMinutes,
      maximum_duration_minutes: maxMinutes
    };
  }

  return { valid: true };
};

/**
 * Validate that the booking date is in the future and within advance booking window
 */
const validateFutureTime = (date, maxAdvanceDays = MAX_ADVANCE_DAYS) => {
  const bookingDate = new Date(date);
  const now = new Date();

  // Strip time from comparison for date-only check
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const bookDay = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());

  if (bookDay < today) {
    return { valid: false, error: 'BOOKING_IN_PAST', message: 'Cannot create bookings in the past' };
  }

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays);

  if (bookDay > maxDate) {
    return {
      valid: false,
      error: 'EXCEEDS_ADVANCE_BOOKING_WINDOW',
      message: `Cannot book more than ${maxAdvanceDays} days in advance`,
      allowed_days: maxAdvanceDays
    };
  }

  return { valid: true };
};

/**
 * Validate booking falls within room operating hours
 */
const validateOperatingHours = (startTime, endTime, operatingStart = '07:00', operatingEnd = '22:00') => {
  if (startTime < operatingStart) {
    return {
      valid: false,
      error: 'OUTSIDE_OPERATING_HOURS',
      message: `Room opens at ${operatingStart}`,
      operating_start: operatingStart,
      requested_start: startTime
    };
  }

  if (endTime > operatingEnd) {
    return {
      valid: false,
      error: 'OUTSIDE_OPERATING_HOURS',
      message: `Room closes at ${operatingEnd}`,
      operating_end: operatingEnd,
      requested_end: endTime
    };
  }

  return { valid: true };
};

/**
 * Check if two time intervals overlap (half-open interval [start, end))
 */
const detectsOverlap = (startA, endA, startB, endB) => {
  return startA < endB && startB < endA;
};

/**
 * Check overlap considering buffer minutes
 */
const detectsOverlapWithBuffer = (existingStart, existingEnd, newStart, newEnd, bufferMinutes = 0) => {
  if (bufferMinutes <= 0) {
    return detectsOverlap(existingStart, existingEnd, newStart, newEnd);
  }

  // Add buffer to existing booking's end time
  const [endH, endM] = existingEnd.split(':').map(Number);
  const totalMinutes = endH * 60 + endM + bufferMinutes;
  const bufferedEnd = `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`;

  // Also check buffer before existing booking's start
  const [startH, startM] = existingStart.split(':').map(Number);
  const preBufferMinutes = startH * 60 + startM - bufferMinutes;
  const bufferedStart = preBufferMinutes >= 0
    ? `${Math.floor(preBufferMinutes / 60).toString().padStart(2, '0')}:${(preBufferMinutes % 60).toString().padStart(2, '0')}`
    : '00:00';

  return newStart < bufferedEnd && newEnd > bufferedStart;
};

/**
 * Validate attendee count against room capacity
 */
const validateCapacity = (roomCapacity, attendeeCount) => {
  if (attendeeCount === null || attendeeCount === undefined) {
    return { valid: true };
  }

  if (attendeeCount <= 0) {
    return {
      valid: false,
      error: 'INVALID_ATTENDEE_COUNT',
      message: 'Attendee count must be at least 1'
    };
  }

  if (attendeeCount > roomCapacity) {
    return {
      valid: false,
      error: 'CAPACITY_EXCEEDED',
      message: `Room capacity is ${roomCapacity}, but ${attendeeCount} attendees requested`,
      room_capacity: roomCapacity,
      requested: attendeeCount
    };
  }

  return { valid: true };
};

/**
 * Generate a unique confirmation code
 */
const generateConfirmationCode = () => {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BK-${year}-${code}`;
};

/**
 * Run all validations for a booking request
 */
const validateBookingRequest = (data, room) => {
  const errors = [];

  // Time order
  const timeOrder = validateTimeOrder(data.startTime, data.endTime);
  if (!timeOrder.valid) errors.push(timeOrder);

  // Duration
  if (data.startTime && data.endTime) {
    const duration = validateDuration(data.startTime, data.endTime);
    if (!duration.valid) errors.push(duration);
  }

  // Future time
  if (data.date) {
    const futureCheck = validateFutureTime(data.date);
    if (!futureCheck.valid) errors.push(futureCheck);
  }

  // Operating hours
  if (room && data.startTime && data.endTime) {
    const opHours = validateOperatingHours(
      data.startTime,
      data.endTime,
      room.operatingHoursStart || '07:00',
      room.operatingHoursEnd || '22:00'
    );
    if (!opHours.valid) errors.push(opHours);
  }

  // Capacity
  if (room && data.attendeeCount) {
    const capacity = validateCapacity(room.capacity, data.attendeeCount);
    if (!capacity.valid) errors.push(capacity);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
};

module.exports = {
  validateTimeOrder,
  validateDuration,
  validateFutureTime,
  validateOperatingHours,
  detectsOverlap,
  detectsOverlapWithBuffer,
  validateCapacity,
  generateConfirmationCode,
  validateBookingRequest,
  MIN_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  MAX_ADVANCE_DAYS
};
