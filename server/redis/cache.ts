import { redisClient, isRedisReady } from './client.js';

interface MemoryCacheEntry {
  value: any;
  expiresAt: number | null;
}

// In-memory fallback cache if Redis is temporarily unreachable
const memoryFallback = new Map<string, MemoryCacheEntry>();

const CACHE_PREFIX = 'saas:cache:';

/**
 * Clean up expired items from the memory fallback periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryFallback.entries()) {
    if (entry.expiresAt !== null && entry.expiresAt <= now) {
      memoryFallback.delete(key);
    }
  }
}, 60000);

export async function getCache<T>(key: string): Promise<T | null> {
  const fullKey = CACHE_PREFIX + key;

  if (isRedisReady()) {
    try {
      const data = await redisClient.get(fullKey);
      if (data === null) return null;
      return JSON.parse(data) as T;
    } catch (err: any) {
      console.warn(`[Redis Cache] GET error on '${key}', falling back to memory:`, err.message);
    }
  }

  // In-memory fallback
  const entry = memoryFallback.get(fullKey);
  if (!entry) return null;
  if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
    memoryFallback.delete(fullKey);
    return null;
  }
  return entry.value as T;
}

export async function setCache<T>(key: string, value: T, ttlSeconds = 300): Promise<boolean> {
  const fullKey = CACHE_PREFIX + key;
  const serialized = JSON.stringify(value);

  // Store in memory fallback as well
  memoryFallback.set(fullKey, {
    value,
    expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
  });

  if (isRedisReady()) {
    try {
      if (ttlSeconds > 0) {
        await redisClient.set(fullKey, serialized, 'EX', ttlSeconds);
      } else {
        await redisClient.set(fullKey, serialized);
      }
      return true;
    } catch (err: any) {
      console.warn(`[Redis Cache] SET error on '${key}':`, err.message);
      return false;
    }
  }

  return true;
}

export async function deleteCache(key: string): Promise<boolean> {
  const fullKey = CACHE_PREFIX + key;
  memoryFallback.delete(fullKey);

  if (isRedisReady()) {
    try {
      await redisClient.del(fullKey);
      return true;
    } catch (err: any) {
      console.warn(`[Redis Cache] DEL error on '${key}':`, err.message);
      return false;
    }
  }

  return true;
}

export async function invalidatePattern(pattern: string): Promise<number> {
  const searchPattern = CACHE_PREFIX + pattern;
  let deletedCount = 0;

  // Clear matching in-memory keys
  const regex = new RegExp('^' + searchPattern.replace(/\*/g, '.*') + '$');
  for (const k of memoryFallback.keys()) {
    if (regex.test(k)) {
      memoryFallback.delete(k);
      deletedCount++;
    }
  }

  if (isRedisReady()) {
    try {
      const keys = await redisClient.keys(searchPattern);
      if (keys.length > 0) {
        deletedCount = await redisClient.del(...keys);
      }
    } catch (err: any) {
      console.warn(`[Redis Cache] Key pattern invalidation error '${pattern}':`, err.message);
    }
  }

  return deletedCount;
}
