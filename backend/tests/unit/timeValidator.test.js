/**
 * Unit Tests: Time Validation
 * Based on testing.md §3.1 — Tests 1.1-1.5, 2.1-2.5, 3.1-3.6
 */
const {
  validateTimeOrder,
  validateDuration,
  validateFutureTime,
  MIN_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  MAX_ADVANCE_DAYS
} = require('../../utils/bookingValidator');

describe('TimeValidator', () => {

  // ─── validateTimeOrder (Tests 1.1 - 1.5) ──────────────────────

  describe('validateTimeOrder', () => {
    test('1.1: Should pass when end time is after start time', () => {
      const result = validateTimeOrder('09:00', '11:00');
      expect(result).toEqual({ valid: true });
    });

    test('1.2: Should fail when end time equals start time', () => {
      const result = validateTimeOrder('09:00', '09:00');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('END_BEFORE_START');
      expect(result.message).toMatch(/end time must be after start time/i);
    });

    test('1.3: Should fail when end time is before start time', () => {
      const result = validateTimeOrder('11:00', '09:00');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('END_BEFORE_START');
    });

    test('1.4: Should fail with null start time', () => {
      const result = validateTimeOrder(null, '11:00');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_START_TIME');
    });

    test('1.5: Should fail with null end time', () => {
      const result = validateTimeOrder('09:00', null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_END_TIME');
    });

    test('1.extra: Should fail with undefined start time', () => {
      const result = validateTimeOrder(undefined, '11:00');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_START_TIME');
    });

    test('1.extra: Should fail with empty string start time', () => {
      const result = validateTimeOrder('', '11:00');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_START_TIME');
    });
  });

  // ─── validateDuration (Tests 2.1 - 2.5) ───────────────────────

  describe('validateDuration', () => {
    test('2.1: Should pass for exactly minimum duration (15 minutes)', () => {
      const result = validateDuration('09:00', '09:15');
      expect(result).toEqual({ valid: true });
    });

    test('2.2: Should fail for 14 minutes (below minimum)', () => {
      const result = validateDuration('09:00', '09:14');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('DURATION_TOO_SHORT');
      expect(result.actual_duration_minutes).toBe(14);
      expect(result.minimum_duration_minutes).toBe(MIN_DURATION_MINUTES);
    });

    test('2.3: Should pass for exactly maximum duration (8 hours)', () => {
      const result = validateDuration('09:00', '17:00');
      expect(result).toEqual({ valid: true });
    });

    test('2.4: Should fail for 8 hours 1 minute (above maximum)', () => {
      const result = validateDuration('09:00', '17:01');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('DURATION_TOO_LONG');
      expect(result.actual_duration_minutes).toBe(481);
      expect(result.maximum_duration_minutes).toBe(MAX_DURATION_MINUTES);
    });

    test('2.5: Should pass for typical 90-minute booking', () => {
      const result = validateDuration('09:00', '10:30');
      expect(result).toEqual({ valid: true });
    });

    test('2.extra: Should fail for 1-minute booking', () => {
      const result = validateDuration('09:00', '09:01');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('DURATION_TOO_SHORT');
    });

    test('2.extra: Should pass for 2-hour booking', () => {
      const result = validateDuration('10:00', '12:00');
      expect(result).toEqual({ valid: true });
    });

    test('2.extra: Should accept custom min/max overrides', () => {
      const result = validateDuration('09:00', '09:10', 10, 60);
      expect(result).toEqual({ valid: true });
    });
  });

  // ─── validateFutureTime (Tests 3.1 - 3.6) ─────────────────────

  describe('validateFutureTime', () => {
    test('3.1: Should pass for booking starting tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = validateFutureTime(tomorrow);
      expect(result).toEqual({ valid: true });
    });

    test('3.2: Should pass for booking starting today', () => {
      const today = new Date();
      const result = validateFutureTime(today);
      expect(result).toEqual({ valid: true });
    });

    test('3.3: Should fail for booking in the past (yesterday)', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = validateFutureTime(yesterday);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('BOOKING_IN_PAST');
      expect(result.message).toMatch(/cannot create bookings in the past/i);
    });

    test('3.4: Should fail for booking 2 days in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);
      const result = validateFutureTime(pastDate);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('BOOKING_IN_PAST');
    });

    test('3.5: Should pass for booking at exact advance limit', () => {
      const atLimit = new Date();
      atLimit.setDate(atLimit.getDate() + MAX_ADVANCE_DAYS);
      const result = validateFutureTime(atLimit);
      expect(result).toEqual({ valid: true });
    });

    test('3.6: Should fail for booking beyond advance limit', () => {
      const beyondLimit = new Date();
      beyondLimit.setDate(beyondLimit.getDate() + MAX_ADVANCE_DAYS + 1);
      const result = validateFutureTime(beyondLimit);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('EXCEEDS_ADVANCE_BOOKING_WINDOW');
      expect(result.allowed_days).toBe(MAX_ADVANCE_DAYS);
    });

    test('3.extra: Should pass for booking 7 days from now', () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const result = validateFutureTime(nextWeek);
      expect(result).toEqual({ valid: true });
    });

    test('3.extra: Should accept custom advance limit', () => {
      const date = new Date();
      date.setDate(date.getDate() + 10);
      const result = validateFutureTime(date, 7);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('EXCEEDS_ADVANCE_BOOKING_WINDOW');
    });
  });
});
