/**
 * Unit Tests: Confirmation Code Generation
 */
const { generateConfirmationCode } = require('../../utils/bookingValidator');

describe('Confirmation Code Generator', () => {

  test('Should generate code matching BK-YYYY-XXXX pattern', () => {
    const code = generateConfirmationCode();
    expect(code).toMatch(/^BK-\d{4}-[A-Z0-9]{4}$/);
  });

  test('Should include the current year', () => {
    const code = generateConfirmationCode();
    const year = new Date().getFullYear().toString();
    expect(code).toContain(`BK-${year}-`);
  });

  test('Should generate unique codes (100 codes, no duplicates)', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateConfirmationCode());
    }
    // With 31^4 = 923,521 possible codes, 100 should all be unique
    expect(codes.size).toBe(100);
  });

  test('Should only use allowed characters (no ambiguous O/0/I/1)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateConfirmationCode();
      const suffix = code.split('-')[2];
      expect(suffix).not.toMatch(/[OI01]/);
    }
  });

  test('Should return a string', () => {
    const code = generateConfirmationCode();
    expect(typeof code).toBe('string');
  });
});
