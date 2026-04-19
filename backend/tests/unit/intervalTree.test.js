const IntervalTree = require('../../utils/IntervalTree');

describe('IntervalTree', () => {
  let tree;

  beforeEach(() => {
    tree = new IntervalTree();
  });

  describe('insert and query', () => {
    test('should insert intervals and query overlaps', () => {
      tree.insert('09:00', '10:00', 'booking1');
      tree.insert('11:00', '12:00', 'booking2');
      tree.insert('14:00', '15:00', 'booking3');

      expect(tree.size).toBe(3);

      // Query that overlaps with booking1
      const overlaps1 = tree.queryOverlap('09:30', '10:30', 0);
      expect(overlaps1).toContain('booking1');
      expect(overlaps1).not.toContain('booking2');

      // Query that doesn't overlap with anything
      const overlaps2 = tree.queryOverlap('13:00', '13:30', 0);
      expect(overlaps2).toHaveLength(0);

      // Query that overlaps with booking2
      const overlaps3 = tree.queryOverlap('10:30', '11:30', 0);
      expect(overlaps3).toContain('booking2');
    });

    test('should handle buffer time in queries', () => {
      tree.insert('10:00', '11:00', 'booking1');

      // Without buffer - no overlap
      const noBuffer = tree.queryOverlap('11:00', '12:00', 0);
      expect(noBuffer).toHaveLength(0);

      // With 15 minute buffer - should overlap
      const withBuffer = tree.queryOverlap('11:00', '12:00', 15);
      expect(withBuffer).toContain('booking1');
    });

    test('should handle adjacent bookings correctly', () => {
      tree.insert('09:00', '10:00', 'booking1');
      tree.insert('10:00', '11:00', 'booking2');

      // Adjacent bookings should not overlap (half-open intervals)
      const overlaps = tree.queryOverlap('10:00', '11:00', 0);
      expect(overlaps).toContain('booking2');
      expect(overlaps).not.toContain('booking1');
    });
  });

  describe('delete', () => {
    test('should delete intervals', () => {
      tree.insert('09:00', '10:00', 'booking1');
      tree.insert('11:00', '12:00', 'booking2');
      tree.insert('14:00', '15:00', 'booking3');

      expect(tree.size).toBe(3);

      tree.delete('booking2');
      expect(tree.size).toBe(2);

      const overlaps = tree.queryOverlap('11:00', '12:00', 0);
      expect(overlaps).not.toContain('booking2');
    });

    test('should handle deleting non-existent booking', () => {
      tree.insert('09:00', '10:00', 'booking1');
      tree.delete('nonexistent');
      expect(tree.size).toBe(1);
    });
  });

  describe('clear', () => {
    test('should clear all intervals', () => {
      tree.insert('09:00', '10:00', 'booking1');
      tree.insert('11:00', '12:00', 'booking2');
      
      tree.clear();
      expect(tree.size).toBe(0);
      
      const overlaps = tree.queryOverlap('09:00', '12:00', 0);
      expect(overlaps).toHaveLength(0);
    });
  });

  describe('timeToMinutes', () => {
    test('should convert time strings to minutes', () => {
      expect(IntervalTree.timeToMinutes('00:00')).toBe(0);
      expect(IntervalTree.timeToMinutes('09:30')).toBe(570);
      expect(IntervalTree.timeToMinutes('12:00')).toBe(720);
      expect(IntervalTree.timeToMinutes('23:59')).toBe(1439);
    });
  });
});
