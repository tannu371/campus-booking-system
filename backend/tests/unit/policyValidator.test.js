/**
 * Unit Tests: Policy Validation (Capacity, Operating Hours, Booking Limits)
 * Based on testing.md §3.3 — Tests 6.1-6.5, 7.1-7.5, 9.1-9.3
 */
const {
  validateCapacity,
  validateOperatingHours,
  validateBookingRequest
} = require('../../utils/bookingValidator');

describe('PolicyValidator', () => {

  // ─── validateCapacity (Tests 6.1 - 6.5) ────────────────────────

  describe('validateCapacity', () => {
    test('6.1: Should pass when attendees equals room capacity', () => {
      const result = validateCapacity(30, 30);
      expect(result).toEqual({ valid: true });
    });

    test('6.2: Should fail when attendees exceed room capacity', () => {
      const result = validateCapacity(30, 31);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('CAPACITY_EXCEEDED');
      expect(result.room_capacity).toBe(30);
      expect(result.requested).toBe(31);
    });

    test('6.3: Should pass when attendee_count not provided (null)', () => {
      const result = validateCapacity(30, null);
      expect(result).toEqual({ valid: true });
    });

    test('6.3b: Should pass when attendee_count is undefined', () => {
      const result = validateCapacity(30, undefined);
      expect(result).toEqual({ valid: true });
    });

    test('6.4: Should fail with zero attendees', () => {
      const result = validateCapacity(30, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_ATTENDEE_COUNT');
      expect(result.message).toMatch(/at least 1/i);
    });

    test('6.5: Should fail with negative attendees', () => {
      const result = validateCapacity(30, -1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_ATTENDEE_COUNT');
    });

    test('6.extra: Should pass for 1 attendee in a large room', () => {
      const result = validateCapacity(200, 1);
      expect(result).toEqual({ valid: true });
    });

    test('6.extra: Should fail when capacity is 1 and attendees is 2', () => {
      const result = validateCapacity(1, 2);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('CAPACITY_EXCEEDED');
    });
  });

  // ─── validateOperatingHours (Tests 9.1 - 9.3) ─────────────────

  describe('validateOperatingHours', () => {
    test('9.1: Should pass for booking within operating hours', () => {
      const result = validateOperatingHours('09:00', '11:00', '07:00', '22:00');
      expect(result).toEqual({ valid: true });
    });

    test('9.2: Should fail for booking starting before operating hours', () => {
      const result = validateOperatingHours('06:30', '08:00', '07:00', '22:00');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('OUTSIDE_OPERATING_HOURS');
      expect(result.operating_start).toBe('07:00');
      expect(result.requested_start).toBe('06:30');
    });

    test('9.3: Should fail for booking ending after operating hours', () => {
      const result = validateOperatingHours('21:00', '23:00', '07:00', '22:00');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('OUTSIDE_OPERATING_HOURS');
      expect(result.operating_end).toBe('22:00');
      expect(result.requested_end).toBe('23:00');
    });

    test('9.extra: Should pass for booking at exact operating start', () => {
      const result = validateOperatingHours('07:00', '09:00', '07:00', '22:00');
      expect(result).toEqual({ valid: true });
    });

    test('9.extra: Should pass for booking ending at exact operating end', () => {
      const result = validateOperatingHours('20:00', '22:00', '07:00', '22:00');
      expect(result).toEqual({ valid: true });
    });

    test('9.extra: Should use default operating hours (07:00-22:00)', () => {
      const result = validateOperatingHours('08:00', '10:00');
      expect(result).toEqual({ valid: true });
    });

    test('9.extra: Should fail when both start and end are outside hours', () => {
      const result = validateOperatingHours('06:00', '23:00', '07:00', '22:00');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('OUTSIDE_OPERATING_HOURS');
    });

    test('9.extra: Should handle narrow operating window', () => {
      const result = validateOperatingHours('09:00', '18:00', '09:00', '17:00');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('OUTSIDE_OPERATING_HOURS');
    });
  });

  // ─── validateBookingRequest (compound) ─────────────────────────

  describe('validateBookingRequest (compound validation)', () => {
    const room = {
      capacity: 30,
      operatingHoursStart: '07:00',
      operatingHoursEnd: '22:00'
    };

    test('Should pass for a fully valid booking request', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const data = {
        startTime: '09:00',
        endTime: '11:00',
        date: tomorrow,
        attendeeCount: 10
      };
      const result = validateBookingRequest(data, room);
      expect(result).toEqual({ valid: true });
    });

    test('Should collect multiple errors for invalid request', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const data = {
        startTime: '11:00',
        endTime: '09:00', // end before start
        date: yesterday,   // past date
        attendeeCount: 50  // over capacity
      };
      const result = validateBookingRequest(data, room);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    test('Should fail when start time is missing', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const data = { endTime: '11:00', date: tomorrow };
      const result = validateBookingRequest(data, room);
      expect(result.valid).toBe(false);
      expect(result.errors[0].error).toBe('MISSING_START_TIME');
    });

    test('Should validate without room (room=null)', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const data = { startTime: '09:00', endTime: '11:00', date: tomorrow };
      const result = validateBookingRequest(data, null);
      expect(result).toEqual({ valid: true });
    });
  });
});
