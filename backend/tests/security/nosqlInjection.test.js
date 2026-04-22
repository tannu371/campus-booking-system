/**
 * NoSQL Injection Protection Tests
 * 
 * Tests that query parameters are properly sanitized to prevent NoSQL injection attacks
 */

const { sanitizeValue, sanitizeString, sanitizeObjectId, sanitizeNumber, sanitizeDate } = require('../../utils/sanitizeQuery');

describe('NoSQL Injection Protection - Sanitization Functions', () => {
  describe('sanitizeValue', () => {
    test('NI-01: Rejects objects (NoSQL operators)', () => {
      expect(sanitizeValue({ $ne: 'value' })).toBeNull();
      expect(sanitizeValue({ $gt: 5 })).toBeNull();
      expect(sanitizeValue({ $regex: '.*' })).toBeNull();
      expect(sanitizeValue([])).toBeNull();
    });

    test('NI-02: Allows primitive values', () => {
      expect(sanitizeValue('string')).toBe('string');
      expect(sanitizeValue(123)).toBe(123);
      expect(sanitizeValue(true)).toBe(true);
    });

    test('NI-03: Handles null and undefined', () => {
      expect(sanitizeValue(null)).toBeNull();
      expect(sanitizeValue(undefined)).toBeNull();
    });
  });

  describe('sanitizeString', () => {
    test('NI-04: Converts primitives to strings', () => {
      expect(sanitizeString('test')).toBe('test');
      expect(sanitizeString(123)).toBe('123');
      expect(sanitizeString(true)).toBe('true');
    });

    test('NI-05: Rejects objects', () => {
      expect(sanitizeString({ $ne: 'value' })).toBeNull();
      expect(sanitizeString(['array'])).toBeNull();
    });

    test('NI-06: Validates against whitelist', () => {
      const allowedValues = ['approved', 'pending', 'rejected'];
      
      expect(sanitizeString('approved', allowedValues)).toBe('approved');
      expect(sanitizeString('pending', allowedValues)).toBe('pending');
      expect(sanitizeString('invalid', allowedValues)).toBeNull();
      expect(sanitizeString('cancelled', allowedValues)).toBeNull();
    });
  });

  describe('sanitizeObjectId', () => {
    test('NI-07: Accepts valid ObjectId format', () => {
      const validId = '507f1f77bcf86cd799439011';
      expect(sanitizeObjectId(validId)).toBe(validId);
    });

    test('NI-08: Rejects invalid ObjectId formats', () => {
      expect(sanitizeObjectId('invalid')).toBeNull();
      expect(sanitizeObjectId('123')).toBeNull();
      expect(sanitizeObjectId('507f1f77bcf86cd79943901')).toBeNull(); // 23 chars
      expect(sanitizeObjectId('507f1f77bcf86cd7994390111')).toBeNull(); // 25 chars
      expect(sanitizeObjectId('507f1f77bcf86cd79943901g')).toBeNull(); // non-hex
    });

    test('NI-09: Rejects objects', () => {
      expect(sanitizeObjectId({ $ne: null })).toBeNull();
    });
  });

  describe('sanitizeNumber', () => {
    test('NI-10: Converts valid numbers', () => {
      expect(sanitizeNumber('123')).toBe(123);
      expect(sanitizeNumber(456)).toBe(456);
      expect(sanitizeNumber('78.9')).toBe(78.9);
    });

    test('NI-11: Rejects invalid numbers', () => {
      expect(sanitizeNumber('abc')).toBeNull();
      expect(sanitizeNumber('12abc')).toBeNull();
      expect(sanitizeNumber({ $gt: 5 })).toBeNull();
    });

    test('NI-12: Validates min/max ranges', () => {
      expect(sanitizeNumber(5, { min: 1, max: 10 })).toBe(5);
      expect(sanitizeNumber(0, { min: 1, max: 10 })).toBeNull();
      expect(sanitizeNumber(11, { min: 1, max: 10 })).toBeNull();
    });

    test('NI-13: Uses default value', () => {
      expect(sanitizeNumber('invalid', { default: 10 })).toBe(10);
      expect(sanitizeNumber(null, { default: 5 })).toBe(5);
    });
  });

  describe('sanitizeDate', () => {
    test('NI-14: Accepts valid date strings', () => {
      const dateStr = '2026-05-01';
      const result = sanitizeDate(dateStr);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString().split('T')[0]).toBe(dateStr);
    });

    test('NI-15: Rejects invalid dates', () => {
      expect(sanitizeDate('invalid')).toBeNull();
      expect(sanitizeDate('2026-13-01')).toBeNull(); // Invalid month
      expect(sanitizeDate({ $gt: new Date() })).toBeNull();
    });
  });
});

describe('NoSQL Injection Protection - Attack Scenarios', () => {
  test('NI-16: $ne operator injection blocked', () => {
    const maliciousInput = { $ne: 'cancelled' };
    const sanitized = sanitizeString(maliciousInput);
    expect(sanitized).toBeNull();
  });

  test('NI-17: $gt operator injection blocked', () => {
    const maliciousInput = { $gt: 'user' };
    const sanitized = sanitizeString(maliciousInput);
    expect(sanitized).toBeNull();
  });

  test('NI-18: $regex operator injection blocked', () => {
    const maliciousInput = { $regex: '.*' };
    const sanitized = sanitizeString(maliciousInput);
    expect(sanitized).toBeNull();
  });

  test('NI-19: $or operator injection blocked', () => {
    const maliciousInput = { $or: [{ status: 'approved' }, { status: 'pending' }] };
    const sanitized = sanitizeValue(maliciousInput);
    expect(sanitized).toBeNull();
  });

  test('NI-20: $in operator injection blocked', () => {
    const maliciousInput = { $in: ['approved', 'pending'] };
    const sanitized = sanitizeValue(maliciousInput);
    expect(sanitized).toBeNull();
  });

  test('NI-21: $exists operator injection blocked', () => {
    const maliciousInput = { $exists: true };
    const sanitized = sanitizeValue(maliciousInput);
    expect(sanitized).toBeNull();
  });

  test('NI-22: Array injection blocked', () => {
    const maliciousInput = ['value1', 'value2'];
    const sanitized = sanitizeValue(maliciousInput);
    expect(sanitized).toBeNull();
  });

  test('NI-23: Nested object injection blocked', () => {
    const maliciousInput = { nested: { $ne: 'value' } };
    const sanitized = sanitizeValue(maliciousInput);
    expect(sanitized).toBeNull();
  });
});

describe('NoSQL Injection Protection - Whitelist Validation', () => {
  test('NI-24: Booking status whitelist', () => {
    const allowedStatuses = ['pending', 'approved', 'rejected', 'cancelled', 'completed', 'no_show', 'auto_released'];
    
    expect(sanitizeString('approved', allowedStatuses)).toBe('approved');
    expect(sanitizeString('pending', allowedStatuses)).toBe('pending');
    expect(sanitizeString('invalid_status', allowedStatuses)).toBeNull();
    expect(sanitizeString({ $ne: 'cancelled' }, allowedStatuses)).toBeNull();
  });

  test('NI-25: User role whitelist', () => {
    const allowedRoles = ['user', 'staff', 'faculty', 'admin'];
    
    expect(sanitizeString('admin', allowedRoles)).toBe('admin');
    expect(sanitizeString('faculty', allowedRoles)).toBe('faculty');
    expect(sanitizeString('superadmin', allowedRoles)).toBeNull();
    expect(sanitizeString({ $regex: '.*' }, allowedRoles)).toBeNull();
  });

  test('NI-26: Room type whitelist', () => {
    const allowedTypes = ['classroom', 'lab', 'seminar_hall', 'conference_room', 'meeting_room'];
    
    expect(sanitizeString('classroom', allowedTypes)).toBe('classroom');
    expect(sanitizeString('lab', allowedTypes)).toBe('lab');
    expect(sanitizeString('invalid_type', allowedTypes)).toBeNull();
  });
});

describe('NoSQL Injection Protection - Edge Cases', () => {
  test('NI-27: Empty string is valid', () => {
    expect(sanitizeString('')).toBe('');
  });

  test('NI-28: Zero is valid number', () => {
    expect(sanitizeNumber(0)).toBe(0);
    expect(sanitizeNumber('0')).toBe(0);
  });

  test('NI-29: Boolean values converted to strings', () => {
    expect(sanitizeString(true)).toBe('true');
    expect(sanitizeString(false)).toBe('false');
  });

  test('NI-30: Special characters in strings are allowed', () => {
    expect(sanitizeString('test@example.com')).toBe('test@example.com');
    expect(sanitizeString('room-123')).toBe('room-123');
    expect(sanitizeString('test_value')).toBe('test_value');
  });

  test('NI-31: Unicode characters are allowed', () => {
    expect(sanitizeString('测试')).toBe('测试');
    expect(sanitizeString('café')).toBe('café');
  });

  test('NI-32: Very long strings are allowed', () => {
    const longString = 'a'.repeat(1000);
    expect(sanitizeString(longString)).toBe(longString);
  });

  test('NI-33: Negative numbers are valid', () => {
    expect(sanitizeNumber(-5)).toBe(-5);
    expect(sanitizeNumber('-10')).toBe(-10);
  });

  test('NI-34: Decimal numbers are valid', () => {
    expect(sanitizeNumber(3.14)).toBe(3.14);
    expect(sanitizeNumber('2.718')).toBe(2.718);
  });
});
