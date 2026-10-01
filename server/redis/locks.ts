import crypto from 'crypto';
import { redisClient, isRedisReady } from './client.js';

const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

const LOCK_PREFIX = 'saas:lock:';

// Fallback in-memory locks if Redis is disconnected
const memoryLocks = new Map<string, { token: string; expiresAt: number }>();

export interface LockHandle {
  lockKey: string;
  token: string;
  acquired: boolean;
}

/**
 * Attempts to acquire a distributed lock.
 * @param lockKey Resource identifier
 * @param ttlMs Time to hold lock in milliseconds (default 10,000ms = 10s)
 */
export async function acquireLock(lockKey: string, ttlMs = 10000): Promise<LockHandle> {
  const fullKey = LOCK_PREFIX + lockKey;
  const token = crypto.randomUUID();

  if (isRedisReady()) {
    try {
      // SET key token NX PX ttlMs
      const res = await redisClient.set(fullKey, token, 'PX', ttlMs, 'NX');
      if (res === 'OK') {
        return { lockKey, token, acquired: true };
      }
      return { lockKey, token, acquired: false };
    } catch (err: any) {
      console.warn(`[Redis Lock] Acquire error for '${lockKey}', using memory fallback:`, err.message);
    }
  }

  // Fallback in-memory locking
  const now = Date.now();
  const existing = memoryLocks.get(fullKey);
  if (!existing || existing.expiresAt <= now) {
    memoryLocks.set(fullKey, { token, expiresAt: now + ttlMs });
    return { lockKey, token, acquired: true };
  }

  return { lockKey, token, acquired: false };
}

/**
 * Releases a previously acquired distributed lock atomically.
 */
export async function releaseLock(lockKey: string, token: string): Promise<boolean> {
  const fullKey = LOCK_PREFIX + lockKey;

  // Release memory lock if present
  const existing = memoryLocks.get(fullKey);
  if (existing && existing.token === token) {
    memoryLocks.delete(fullKey);
  }

  if (isRedisReady()) {
    try {
      const res = await redisClient.eval(RELEASE_LOCK_LUA, 1, fullKey, token);
      return res === 1;
    } catch (err: any) {
      console.warn(`[Redis Lock] Release error for '${lockKey}':`, err.message);
      return false;
    }
  }

  return true;
}

/**
 * Convenience helper to run an exclusive critical section under a distributed lock.
 */
export async function withLock<T>(
  lockKey: string,
  ttlMs: number,
  action: () => Promise<T>
): Promise<{ success: boolean; result?: T; error?: string }> {
  const lock = await acquireLock(lockKey, ttlMs);
  if (!lock.acquired) {
    return {
      success: false,
      error: `Could not acquire lock for '${lockKey}'. Another process is holding it.`,
    };
  }

  try {
    const result = await action();
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message };
  } finally {
    await releaseLock(lockKey, lock.token);
  }
}
