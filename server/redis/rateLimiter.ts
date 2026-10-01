import { Request, Response, NextFunction } from 'express';
import { redisClient, isRedisReady } from './client.js';

interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
  prefix?: string;
  message?: string;
}

const memoryRateLimit = new Map<string, { count: number; resetAt: number }>();

/**
 * Creates an Express middleware for rate limiting using Redis (with in-memory fallback).
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowSeconds,
    maxRequests,
    prefix = 'saas:ratelimit:',
    message = 'Too many requests, please try again later.'
  } = config;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Generate key based on IP or authenticated user ID
    const identifier = (req as any).user?.id || req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${prefix}${identifier}`;

    if (isRedisReady()) {
      try {
        const currentCount = await redisClient.incr(key);

        if (currentCount === 1) {
          // Set TTL on initial increment
          await redisClient.expire(key, windowSeconds);
        }

        const ttl = await redisClient.ttl(key);

        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount));
        res.setHeader('X-RateLimit-Reset', Date.now() + Math.max(0, ttl) * 1000);

        if (currentCount > maxRequests) {
          res.status(429).json({
            error: message,
            retryAfterSeconds: Math.max(1, ttl),
          });
          return;
        }

        next();
        return;
      } catch (err: any) {
        console.warn('[Redis RateLimiter] Redis error, falling back to memory:', err.message);
      }
    }

    // In-memory fallback
    const now = Date.now();
    let entry = memoryRateLimit.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowSeconds * 1000 };
      memoryRateLimit.set(key, entry);
    } else {
      entry.count++;
    }

    const remaining = Math.max(0, maxRequests - entry.count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', entry.resetAt);

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.status(429).json({
        error: message,
        retryAfterSeconds: Math.max(1, retryAfter),
      });
      return;
    }

    next();
  };
}
