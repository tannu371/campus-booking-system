const {
  expandRecurrenceRule,
  validateRecurrenceRule,
  parseRecurrenceRule,
  generateRecurrenceGroupId
} = require('../../utils/recurrenceEngine');

describe('RecurrenceEngine', () => {
  describe('parseRecurrenceRule', () => {
    test('should parse simple rule', () => {
      const rule = 'FREQ=DAILY;COUNT=5';
      const parsed = parseRecurrenceRule(rule);
      
      expect(parsed.FREQ).toBe('DAILY');
      expect(parsed.COUNT).toBe('5');
    });

    test('should parse complex rule', () => {
      const rule = 'FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20241231';
      const parsed = parseRecurrenceRule(rule);
      
      expect(parsed.FREQ).toBe('WEEKLY');
      expect(parsed.BYDAY).toBe('MO,WE,FR');
      expect(parsed.UNTIL).toBe('20241231');
    });
  });

  describe('validateRecurrenceRule', () => {
    test('should validate correct rules', () => {
      expect(validateRecurrenceRule('FREQ=DAILY;COUNT=5').valid).toBe(true);
      expect(validateRecurrenceRule('FREQ=WEEKLY;BYDAY=MO,WE').valid).toBe(true);
      expect(validateRecurrenceRule('FREQ=MONTHLY;UNTIL=20241231').valid).toBe(true);
    });

    test('should reject invalid rules', () => {
      expect(validateRecurrenceRule('COUNT=5').valid).toBe(false); // Missing FREQ
      expect(validateRecurrenceRule('FREQ=YEARLY').valid).toBe(false); // Invalid FREQ
      expect(validateRecurrenceRule('FREQ=WEEKLY;BYDAY=XX').valid).toBe(false); // Invalid BYDAY
      expect(validateRecurrenceRule('FREQ=DAILY;UNTIL=2024').valid).toBe(false); // Invalid UNTIL format
    });
  });

  describe('expandRecurrenceRule', () => {
    test('should expand daily recurrence', () => {
      const rule = 'FREQ=DAILY;COUNT=5';
      const start = new Date('2024-01-01T09:00:00');
      const end = new Date('2024-01-01T10:00:00');
      
      const occurrences = expandRecurrenceRule(rule, start, end);
      
      expect(occurrences).toHaveLength(5);
      expect(occurrences[0].start.toISOString()).toContain('2024-01-01');
      expect(occurrences[1].start.toISOString()).toContain('2024-01-02');
      expect(occurrences[4].start.toISOString()).toContain('2024-01-05');
    });

    test('should expand weekly recurrence with BYDAY', () => {
      const rule = 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6';
      const start = new Date('2024-01-01T09:00:00'); // Monday
      const end = new Date('2024-01-01T10:00:00');
      
      const occurrences = expandRecurrenceRule(rule, start, end);
      
      expect(occurrences.length).toBeGreaterThan(0);
      
      // Check that all occurrences are on MO, WE, or FR
      for (const occ of occurrences) {
        const day = occ.start.getDay();
        expect([1, 3, 5]).toContain(day); // 1=Mon, 3=Wed, 5=Fri
      }
    });

    test('should respect UNTIL date', () => {
      const rule = 'FREQ=DAILY;UNTIL=20240105';
      const start = new Date('2024-01-01T09:00:00');
      const end = new Date('2024-01-01T10:00:00');
      
      const occurrences = expandRecurrenceRule(rule, start, end);
      
      expect(occurrences.length).toBeLessThanOrEqual(5);
      
      // All occurrences should be before or on 2024-01-05
      for (const occ of occurrences) {
        expect(occ.start.getTime()).toBeLessThanOrEqual(new Date('2024-01-05T23:59:59').getTime());
      }
    });

    test('should expand monthly recurrence', () => {
      const rule = 'FREQ=MONTHLY;COUNT=3';
      const start = new Date('2024-01-15T09:00:00');
      const end = new Date('2024-01-15T10:00:00');
      
      const occurrences = expandRecurrenceRule(rule, start, end);
      
      expect(occurrences).toHaveLength(3);
      expect(occurrences[0].start.getMonth()).toBe(0); // January
      expect(occurrences[1].start.getMonth()).toBe(1); // February
      expect(occurrences[2].start.getMonth()).toBe(2); // March
    });

    test('should preserve duration across occurrences', () => {
      const rule = 'FREQ=DAILY;COUNT=3';
      const start = new Date('2024-01-01T09:00:00');
      const end = new Date('2024-01-01T11:30:00'); // 2.5 hour duration
      
      const occurrences = expandRecurrenceRule(rule, start, end);
      
      for (const occ of occurrences) {
        const duration = occ.end.getTime() - occ.start.getTime();
        expect(duration).toBe(2.5 * 60 * 60 * 1000); // 2.5 hours in ms
      }
    });

    test('should respect max occurrences limit', () => {
      const rule = 'FREQ=DAILY;COUNT=1000';
      const start = new Date('2024-01-01T09:00:00');
      const end = new Date('2024-01-01T10:00:00');
      
      const occurrences = expandRecurrenceRule(rule, start, end, 100);
      
      expect(occurrences.length).toBeLessThanOrEqual(100);
    });
  });

  describe('generateRecurrenceGroupId', () => {
    test('should generate unique IDs', () => {
      const id1 = generateRecurrenceGroupId();
      const id2 = generateRecurrenceGroupId();
      
      expect(id1).toMatch(/^REC-\d+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^REC-\d+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});
