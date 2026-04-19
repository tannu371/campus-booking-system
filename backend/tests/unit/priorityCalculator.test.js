const {
  calculatePriority,
  determineInitialStatus,
  findPreemptableBookings,
  canOverride,
  getPriorityLabel,
  PRIORITY_LEVELS
} = require('../../utils/priorityCalculator');

describe('PriorityCalculator', () => {
  describe('calculatePriority', () => {
    test('should return correct priority for each role', () => {
      expect(calculatePriority('admin')).toBe(1);
      expect(calculatePriority('faculty')).toBe(2);
      expect(calculatePriority('staff')).toBe(3);
      expect(calculatePriority('user')).toBe(4);
      expect(calculatePriority('guest')).toBe(5);
    });

    test('should default to user priority for unknown roles', () => {
      expect(calculatePriority('unknown')).toBe(4);
      expect(calculatePriority(null)).toBe(4);
    });
  });

  describe('determineInitialStatus', () => {
    test('should mark admin bookings as pending for approval-required rooms', () => {
      const admin = { role: 'admin' };
      const roomRequiresApproval = { requiresApproval: true };
      const roomNoApproval = { requiresApproval: false };
      
      expect(determineInitialStatus(admin, roomRequiresApproval)).toBe('pending');
      expect(determineInitialStatus(admin, roomNoApproval)).toBe('approved');
    });

    test('should mark faculty bookings as pending for approval-required rooms', () => {
      const faculty = { role: 'faculty' };
      const roomRequiresApproval = { requiresApproval: true };
      
      expect(determineInitialStatus(faculty, roomRequiresApproval)).toBe('pending');
    });

    test('should respect room approval requirement for regular users', () => {
      const user = { role: 'user' };
      const roomRequiresApproval = { requiresApproval: true };
      const roomNoApproval = { requiresApproval: false };
      
      expect(determineInitialStatus(user, roomRequiresApproval)).toBe('pending');
      expect(determineInitialStatus(user, roomNoApproval)).toBe('approved');
    });

    test('should respect room approval requirement for staff', () => {
      const staff = { role: 'staff' };
      const roomRequiresApproval = { requiresApproval: true };
      const roomNoApproval = { requiresApproval: false };
      
      expect(determineInitialStatus(staff, roomRequiresApproval)).toBe('pending');
      expect(determineInitialStatus(staff, roomNoApproval)).toBe('approved');
    });
  });

  describe('findPreemptableBookings', () => {
    test('should find bookings with lower priority', () => {
      const conflicts = [
        { _id: '1', user: { role: 'user' } },
        { _id: '2', user: { role: 'staff' } },
        { _id: '3', user: { role: 'faculty' } }
      ];
      
      const adminPriority = calculatePriority('admin');
      const preemptable = findPreemptableBookings(conflicts, adminPriority);
      
      expect(preemptable).toHaveLength(3); // Admin can preempt all
    });

    test('should not find bookings with equal or higher priority', () => {
      const conflicts = [
        { _id: '1', user: { role: 'admin' } },
        { _id: '2', user: { role: 'faculty' } },
        { _id: '3', user: { role: 'user' } }
      ];
      
      const facultyPriority = calculatePriority('faculty');
      const preemptable = findPreemptableBookings(conflicts, facultyPriority);
      
      expect(preemptable).toHaveLength(1); // Only user booking
      expect(preemptable[0]._id).toBe('3');
    });

    test('should handle empty conflicts', () => {
      const preemptable = findPreemptableBookings([], 1);
      expect(preemptable).toHaveLength(0);
    });
  });

  describe('canOverride', () => {
    test('should allow higher priority to override lower priority', () => {
      const admin = { role: 'admin' };
      const userBooking = { user: { role: 'user' } };
      
      expect(canOverride(admin, userBooking)).toBe(true);
    });

    test('should not allow lower priority to override higher priority', () => {
      const user = { role: 'user' };
      const adminBooking = { user: { role: 'admin' } };
      
      expect(canOverride(user, adminBooking)).toBe(false);
    });

    test('should not allow same priority to override', () => {
      const user1 = { role: 'user' };
      const user2Booking = { user: { role: 'user' } };
      
      expect(canOverride(user1, user2Booking)).toBe(false);
    });
  });

  describe('getPriorityLabel', () => {
    test('should return correct labels', () => {
      expect(getPriorityLabel(1)).toBe('Critical');
      expect(getPriorityLabel(2)).toBe('High');
      expect(getPriorityLabel(3)).toBe('Medium');
      expect(getPriorityLabel(4)).toBe('Normal');
      expect(getPriorityLabel(5)).toBe('Low');
    });

    test('should default to Normal for unknown priority', () => {
      expect(getPriorityLabel(99)).toBe('Normal');
    });
  });

  describe('PRIORITY_LEVELS', () => {
    test('should have correct priority levels', () => {
      expect(PRIORITY_LEVELS.admin).toBe(1);
      expect(PRIORITY_LEVELS.faculty).toBe(2);
      expect(PRIORITY_LEVELS.staff).toBe(3);
      expect(PRIORITY_LEVELS.user).toBe(4);
      expect(PRIORITY_LEVELS.guest).toBe(5);
    });
  });
});
