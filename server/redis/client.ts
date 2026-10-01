import { Redis } from 'ioredis';

let isConnected = false;
let isReady = false;
let lastError: string | null = null;
let lastConnectTime: string | null = null;

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Primary Redis client for commands, caching, locks, and queues
export const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 5000,
  lazyConnect: true,
  retryStrategy(times) {
    // Exponential backoff with a cap of 3000ms
    const delay = Math.min(times * 150, 3000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // Reconnect on read-only errors
    }
    return false;
  },
});

// Dedicated Redis client for Pub/Sub subscriptions (ioredis requires dedicated connection for subscribe)
export const redisSubscriber = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  connectTimeout: 5000,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 150, 3000);
    return delay;
  },
});

// Connection lifecycle event listeners for Primary Client
redisClient.on('connect', () => {
  isConnected = true;
  lastError = null;
  lastConnectTime = new Date().toISOString();
  console.log('[Redis] Connection established to Redis server.');
});

redisClient.on('ready', () => {
  isReady = true;
  lastError = null;
  console.log('[Redis] Client is ready to accept commands.');
});

redisClient.on('error', (err) => {
  lastError = err.message;
  // Non-fatal logging: prevents unhandled exceptions from crashing the process
  console.warn('[Redis] Connection error encountered:', err.message);
});

redisClient.on('close', () => {
  isReady = false;
  isConnected = false;
  console.log('[Redis] Connection closed.');
});

redisClient.on('reconnecting', (delay: number) => {
  console.log(`[Redis] Reconnecting in ${delay}ms...`);
});

// Subscriber lifecycle listeners
redisSubscriber.on('error', (err) => {
  console.warn('[Redis Pub/Sub] Subscriber error:', err.message);
});

export function isRedisReady(): boolean {
  return isReady && redisClient.status === 'ready';
}

export interface RedisHealth {
  status: 'Not configured' | 'Connected' | 'Unavailable';
  isReady: boolean;
  clientStatus: string;
  latencyMs: number | null;
  uptimeSeconds?: number;
  connectedClients?: number;
  usedMemoryHuman?: string;
  lastError: string | null;
  lastConnectTime: string | null;
  configuredUrl: string;
}

/**
 * Performs a live ping and info check against Redis with safety timeout.
 */
export async function getRedisHealth(): Promise<RedisHealth> {
  const isConfigured = Boolean(process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '');
  const rawUrl = process.env.REDIS_URL || 'Not configured';
  const maskedUrl = rawUrl.includes('@') ? rawUrl.replace(/:[^:@]+@/, ':***@') : rawUrl;

  if (!isConfigured) {
    return {
      status: 'Not configured',
      isReady: false,
      clientStatus: 'not_configured',
      latencyMs: null,
      lastError: null,
      lastConnectTime: null,
      configuredUrl: 'Not configured',
    };
  }

  if (redisClient.status !== 'ready') {
    return {
      status: 'Unavailable',
      isReady: false,
      clientStatus: redisClient.status,
      latencyMs: null,
      lastError,
      lastConnectTime,
      configuredUrl: maskedUrl,
    };
  }

  const start = performance.now();
  try {
    const pingResult = await Promise.race([
      redisClient.ping(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Redis ping timeout (1500ms)')), 1500))
    ]);

    const latencyMs = Math.round((performance.now() - start) * 100) / 100;

    let uptimeSeconds: number | undefined;
    let connectedClients: number | undefined;
    let usedMemoryHuman: string | undefined;

    try {
      const info = await redisClient.info();
      const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
      const clientsMatch = info.match(/connected_clients:(\d+)/);
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);

      if (uptimeMatch) uptimeSeconds = parseInt(uptimeMatch[1], 10);
      if (clientsMatch) connectedClients = parseInt(clientsMatch[1], 10);
      if (memoryMatch) usedMemoryHuman = memoryMatch[1].trim();
    } catch {
      // Info parsing failure is non-fatal
    }

    return {
      status: pingResult === 'PONG' ? 'Connected' : 'Unavailable',
      isReady: true,
      clientStatus: redisClient.status,
      latencyMs,
      uptimeSeconds,
      connectedClients,
      usedMemoryHuman,
      lastError: null,
      lastConnectTime,
      configuredUrl: maskedUrl,
    };
  } catch (err: any) {
    return {
      status: 'Unavailable',
      isReady: false,
      clientStatus: redisClient.status,
      latencyMs: null,
      lastError: err.message,
      lastConnectTime,
      configuredUrl: maskedUrl,
    };
  }
}

/**
 * Initializes the Redis connection safely on server startup.
 */
export async function initRedis(): Promise<void> {
  const isConfigured = Boolean(process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '');
  if (!isConfigured) {
    console.log('[Redis] REDIS_URL not configured. Redis features will remain idle during preview.');
    return;
  }

  try {
    if (redisClient.status === 'wait') {
      await redisClient.connect();
    }
    if (redisSubscriber.status === 'wait') {
      await redisSubscriber.connect();
    }
    console.log('[Redis] Initial connection initiated successfully.');
  } catch (err: any) {
    console.warn('[Redis] Note: Initial Redis connection failed. Redis status is Unavailable:', err.message);
  }
}
