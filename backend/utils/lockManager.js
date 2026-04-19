/**
 * In-Process Lock Manager
 * Provides distributed-lock-like semantics for single-server deployment
 * Uses exponential backoff with jitter for retry logic
 */

class LockManager {
  constructor() {
    // Map of lockKey -> { value, expiresAt }
    this.locks = new Map();
    
    // Cleanup expired locks every 30 seconds
    this.cleanupInterval = setInterval(() => this._cleanup(), 30000);
  }

  /**
   * Try to acquire a lock with exponential backoff
   * @param {string} key - Lock key (e.g., "lock:room123:2024-12-15")
   * @param {string} value - Unique value for this lock holder (e.g., requestId)
   * @param {number} ttlMs - Time to live in milliseconds
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} baseDelayMs - Base delay for exponential backoff
   * @returns {Promise<Object|null>} Lock object or null if failed
   */
  async tryAcquireLock(key, value, ttlMs = 5000, maxRetries = 3, baseDelayMs = 50) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const acquired = this._tryAcquire(key, value, ttlMs);
      
      if (acquired) {
        return { key, value, expiresAt: acquired.expiresAt };
      }

      // If not last attempt, wait with exponential backoff + jitter
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * delay * 0.3; // 30% jitter
        await this._sleep(delay + jitter);
      }
    }

    return null; // Failed to acquire lock
  }

  /**
   * Attempt to acquire lock (single try)
   */
  _tryAcquire(key, value, ttlMs) {
    const now = Date.now();
    const existing = this.locks.get(key);

    // Check if lock exists and is not expired
    if (existing && existing.expiresAt > now) {
      return null; // Lock held by someone else
    }

    // Acquire the lock
    const expiresAt = now + ttlMs;
    this.locks.set(key, { value, expiresAt });
    return { expiresAt };
  }

  /**
   * Release a lock (only if value matches)
   * @param {Object} lock - Lock object from tryAcquireLock
   * @returns {boolean} True if released, false if not held
   */
  releaseLock(lock) {
    if (!lock || !lock.key) return false;

    const existing = this.locks.get(lock.key);
    
    // Only release if value matches (prevents releasing someone else's lock)
    if (existing && existing.value === lock.value) {
      this.locks.delete(lock.key);
      return true;
    }

    return false;
  }

  /**
   * Acquire multiple locks in sorted order (deadlock prevention)
   * @param {Array<string>} keys - Array of lock keys
   * @param {string} value - Unique value for this lock holder
   * @param {number} ttlMs - Time to live in milliseconds
   * @returns {Promise<Array<Object>|null>} Array of lock objects or null if any failed
   */
  async acquireAllLocks(keys, value, ttlMs = 5000) {
    // Sort keys to prevent deadlock
    const sortedKeys = [...keys].sort();
    const acquiredLocks = [];

    try {
      for (const key of sortedKeys) {
        const lock = await this.tryAcquireLock(key, value, ttlMs, 3, 50);
        
        if (!lock) {
          // Failed to acquire - release all previously acquired locks
          for (const acquiredLock of acquiredLocks) {
            this.releaseLock(acquiredLock);
          }
          return null;
        }

        acquiredLocks.push(lock);
      }

      return acquiredLocks;
    } catch (error) {
      // Release all acquired locks on error
      for (const acquiredLock of acquiredLocks) {
        this.releaseLock(acquiredLock);
      }
      throw error;
    }
  }

  /**
   * Release multiple locks
   * @param {Array<Object>} locks - Array of lock objects
   */
  releaseAllLocks(locks) {
    if (!locks || !Array.isArray(locks)) return;
    
    for (const lock of locks) {
      this.releaseLock(lock);
    }
  }

  /**
   * Check if a lock is currently held
   * @param {string} key - Lock key
   * @returns {boolean}
   */
  isLocked(key) {
    const existing = this.locks.get(key);
    return !!(existing && existing.expiresAt > Date.now());
  }

  /**
   * Cleanup expired locks
   */
  _cleanup() {
    const now = Date.now();
    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(key);
      }
    }
  }

  /**
   * Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get lock statistics (for monitoring)
   */
  getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const lock of this.locks.values()) {
      if (lock.expiresAt > now) {
        active++;
      } else {
        expired++;
      }
    }

    return { active, expired, total: this.locks.size };
  }

  /**
   * Shutdown the lock manager
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.locks.clear();
  }
}

// Singleton instance
const lockManager = new LockManager();

module.exports = lockManager;
