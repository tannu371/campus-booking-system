const lockManager = require('../../utils/lockManager');

describe('LockManager', () => {
  beforeEach(() => {
    // Clear all locks before each test
    lockManager.locks.clear();
  });

  afterAll(() => {
    // Cleanup interval to prevent Jest from hanging
    lockManager.shutdown();
  });

  describe('tryAcquireLock', () => {
    test('should acquire lock successfully', async () => {
      const lock = await lockManager.tryAcquireLock('test-key', 'value1', 5000, 0);
      
      expect(lock).not.toBeNull();
      expect(lock.key).toBe('test-key');
      expect(lock.value).toBe('value1');
      expect(lock.expiresAt).toBeGreaterThan(Date.now());
    });

    test('should fail to acquire lock when already held', async () => {
      await lockManager.tryAcquireLock('test-key', 'value1', 5000, 0);
      const lock2 = await lockManager.tryAcquireLock('test-key', 'value2', 5000, 0);
      
      expect(lock2).toBeNull();
    });

    test('should acquire lock after expiration', async () => {
      await lockManager.tryAcquireLock('test-key', 'value1', 100, 0);
      
      // Wait for lock to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const lock2 = await lockManager.tryAcquireLock('test-key', 'value2', 5000, 0);
      expect(lock2).not.toBeNull();
      expect(lock2.value).toBe('value2');
    });

    test('should retry with exponential backoff', async () => {
      const lock1 = await lockManager.tryAcquireLock('test-key', 'value1', 200, 0);
      
      // Try to acquire with retries - should succeed after lock1 expires
      const startTime = Date.now();
      const lock2 = await lockManager.tryAcquireLock('test-key', 'value2', 5000, 3, 50);
      const elapsed = Date.now() - startTime;
      
      expect(lock2).not.toBeNull();
      expect(elapsed).toBeGreaterThan(150); // Should have waited for expiration
    });
  });

  describe('releaseLock', () => {
    test('should release lock successfully', async () => {
      const lock = await lockManager.tryAcquireLock('test-key', 'value1', 5000, 0);
      const released = lockManager.releaseLock(lock);
      
      expect(released).toBe(true);
      expect(lockManager.isLocked('test-key')).toBe(false);
    });

    test('should not release lock with wrong value', async () => {
      await lockManager.tryAcquireLock('test-key', 'value1', 5000, 0);
      const released = lockManager.releaseLock({ key: 'test-key', value: 'wrong-value' });
      
      expect(released).toBe(false);
      expect(lockManager.isLocked('test-key')).toBe(true);
    });
  });

  describe('acquireAllLocks', () => {
    test('should acquire multiple locks in sorted order', async () => {
      const keys = ['lock-c', 'lock-a', 'lock-b'];
      const locks = await lockManager.acquireAllLocks(keys, 'value1', 5000);
      
      expect(locks).not.toBeNull();
      expect(locks).toHaveLength(3);
      
      // Verify all locks are held
      expect(lockManager.isLocked('lock-a')).toBe(true);
      expect(lockManager.isLocked('lock-b')).toBe(true);
      expect(lockManager.isLocked('lock-c')).toBe(true);
    });

    test('should release all locks if one fails', async () => {
      // Acquire one lock first
      await lockManager.tryAcquireLock('lock-b', 'other-value', 5000, 0);
      
      const keys = ['lock-a', 'lock-b', 'lock-c'];
      const locks = await lockManager.acquireAllLocks(keys, 'value1', 5000);
      
      expect(locks).toBeNull();
      
      // lock-a should not be held (rolled back)
      expect(lockManager.isLocked('lock-a')).toBe(false);
    });
  });

  describe('releaseAllLocks', () => {
    test('should release multiple locks', async () => {
      const keys = ['lock-a', 'lock-b', 'lock-c'];
      const locks = await lockManager.acquireAllLocks(keys, 'value1', 5000);
      
      lockManager.releaseAllLocks(locks);
      
      expect(lockManager.isLocked('lock-a')).toBe(false);
      expect(lockManager.isLocked('lock-b')).toBe(false);
      expect(lockManager.isLocked('lock-c')).toBe(false);
    });
  });

  describe('isLocked', () => {
    test('should return true for held lock', async () => {
      await lockManager.tryAcquireLock('test-key', 'value1', 5000, 0);
      expect(lockManager.isLocked('test-key')).toBe(true);
    });

    test('should return false for non-existent lock', () => {
      expect(lockManager.isLocked('nonexistent')).toBe(false);
    });

    test('should return false for expired lock', async () => {
      await lockManager.tryAcquireLock('test-key', 'value1', 100, 0);
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(lockManager.isLocked('test-key')).toBe(false);
    });
  });

  describe('getStats', () => {
    test('should return lock statistics', async () => {
      await lockManager.tryAcquireLock('lock-1', 'value1', 5000, 0);
      await lockManager.tryAcquireLock('lock-2', 'value2', 5000, 0);
      
      const stats = lockManager.getStats();
      expect(stats.active).toBe(2);
      expect(stats.total).toBe(2);
    });
  });
});
