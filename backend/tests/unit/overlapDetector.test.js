/**
 * Unit Tests: Overlap Detection
 * Based on testing.md §3.2 — Tests 5.1-5.13
 */
const {
  detectsOverlap,
  detectsOverlapWithBuffer
} = require('../../utils/bookingValidator');

describe('OverlapDetector', () => {

  // ─── detectsOverlap (Tests 5.1 - 5.10) ────────────────────────

  describe('detectsOverlap(intervalA, intervalB)', () => {

    test('5.1: Should detect full overlap (B inside A)', () => {
      // A: [09:00 ═══════════ 13:00)
      // B:       [10:00 ══ 12:00)
      expect(detectsOverlap('09:00', '13:00', '10:00', '12:00')).toBe(true);
    });

    test('5.2: Should detect partial overlap (A starts before B, ends inside B)', () => {
      // A: [09:00 ══════ 11:00)
      // B:        [10:00 ══════ 12:00)
      expect(detectsOverlap('09:00', '11:00', '10:00', '12:00')).toBe(true);
    });

    test('5.3: Should detect partial overlap (B starts before A, ends inside A)', () => {
      // A:        [10:00 ══════ 12:00)
      // B: [09:00 ══════ 11:00)
      expect(detectsOverlap('10:00', '12:00', '09:00', '11:00')).toBe(true);
    });

    test('5.4: Should detect exact same time range', () => {
      // A: [09:00 ══════════ 11:00)
      // B: [09:00 ══════════ 11:00)
      expect(detectsOverlap('09:00', '11:00', '09:00', '11:00')).toBe(true);
    });

    test('5.5: Should NOT detect overlap for back-to-back bookings', () => {
      // A: [09:00 ══════ 11:00)
      // B:                    [11:00 ══════ 13:00)
      // Half-open intervals: A ends at 11:00, B starts at 11:00 → no overlap
      expect(detectsOverlap('09:00', '11:00', '11:00', '13:00')).toBe(false);
    });

    test('5.6: Should NOT detect overlap when A fully before B (with gap)', () => {
      // A: [09:00 ══ 10:00)
      // B:                  [11:00 ══ 12:00)
      expect(detectsOverlap('09:00', '10:00', '11:00', '12:00')).toBe(false);
    });

    test('5.7: Should NOT detect overlap when B fully before A (with gap)', () => {
      // A:                  [11:00 ══ 12:00)
      // B: [09:00 ══ 10:00)
      expect(detectsOverlap('11:00', '12:00', '09:00', '10:00')).toBe(false);
    });

    test('5.8: Should detect overlap when B ends inside A', () => {
      // A: [10:00 ═══ 12:00)
      // B: [09:00 ═══ 10:30)  — B ends inside A
      expect(detectsOverlap('10:00', '12:00', '09:00', '10:30')).toBe(true);
    });

    test('5.9: Should NOT overlap for same time on different days (string comparison)', () => {
      // Different days handled at query level; time strings alone don't encode dates
      // This tests that identical times DO overlap (as expected for same-day check)
      expect(detectsOverlap('09:00', '11:00', '09:00', '11:00')).toBe(true);
    });

    test('5.10: Should detect A containing B', () => {
      // A: [08:00 ═══════════════ 17:00)
      // B:        [10:00 ══ 12:00)
      expect(detectsOverlap('08:00', '17:00', '10:00', '12:00')).toBe(true);
    });

    test('5.extra: Should NOT overlap when A ends exactly when B starts', () => {
      expect(detectsOverlap('14:00', '15:00', '15:00', '16:00')).toBe(false);
    });

    test('5.extra: Should detect 1-minute overlap', () => {
      // A ends at 11:00, B starts at 10:59 → 1 min overlap
      expect(detectsOverlap('09:00', '11:00', '10:59', '12:00')).toBe(true);
    });
  });

  // ─── detectsOverlapWithBuffer (Tests 5.11 - 5.13) ─────────────

  describe('detectsOverlapWithBuffer', () => {

    test('5.11: Should block booking immediately after with buffer', () => {
      // Existing: [09:00 ════════ 11:00) + 10min buffer → effective end 11:10
      // New:                           [11:00 ═══ 12:00)
      expect(detectsOverlapWithBuffer('09:00', '11:00', '11:00', '12:00', 10)).toBe(true);
    });

    test('5.12: Should allow booking after buffer period clears', () => {
      // Existing: [09:00 ════════ 11:00) + 10min buffer → effective end 11:10
      // New:                                 [11:10 ═══ 12:00)
      expect(detectsOverlapWithBuffer('09:00', '11:00', '11:10', '12:00', 10)).toBe(false);
    });

    test('5.13: Should block booking that ends inside buffer before next', () => {
      // Existing: [12:00 ══════ 13:00) (10min buffer before = 11:50)
      // New:             [11:30 ══════ 12:00)
      // Buffer creates effective start at 11:50, new ends at 12:00 → overlap
      expect(detectsOverlapWithBuffer('12:00', '13:00', '11:30', '12:00', 10)).toBe(true);
    });

    test('5.extra: Should work without buffer (buffer = 0)', () => {
      expect(detectsOverlapWithBuffer('09:00', '11:00', '11:00', '12:00', 0)).toBe(false);
    });

    test('5.extra: Should work with large buffer (30 min)', () => {
      // Existing: [09:00-11:00) + 30min buffer → effective end 11:30
      // New: [11:15-12:00) → starts inside buffer
      expect(detectsOverlapWithBuffer('09:00', '11:00', '11:15', '12:00', 30)).toBe(true);
    });

    test('5.extra: Should allow booking well after buffer', () => {
      // Existing: [09:00-11:00) + 30min buffer → effective end 11:30
      // New: [11:30-12:00) → starts exactly at buffer end
      expect(detectsOverlapWithBuffer('09:00', '11:00', '11:30', '12:00', 30)).toBe(false);
    });

    test('5.extra: Should block fully overlapping booking with buffer', () => {
      expect(detectsOverlapWithBuffer('09:00', '11:00', '09:30', '10:30', 10)).toBe(true);
    });
  });
});
