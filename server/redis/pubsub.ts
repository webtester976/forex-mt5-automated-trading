import EventEmitter from 'events';
import { redisClient, redisSubscriber, isRedisReady } from './client.js';

const localEmitter = new EventEmitter();
const activeSubscriptions = new Map<string, Set<(data: any) => void>>();

// Listen for Redis pub/sub messages
redisSubscriber.on('message', (channel, message) => {
  try {
    const parsed = JSON.parse(message);
    const handlers = activeSubscriptions.get(channel);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(parsed);
        } catch (handlerErr) {
          console.error(`[Redis Pub/Sub] Handler error on channel ${channel}:`, handlerErr);
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Redis Pub/Sub] Failed to parse message on ${channel}:`, err.message);
  }
});

/**
 * Standard channels for real-time application events
 */
export const Channels = {
  MT5_SYNC: 'saas:events:mt5_sync',
  TRADES_LIVE: 'saas:events:trades_live',
  RISK_ALERTS: 'saas:events:risk_alerts',
  NOTIFICATIONS: 'saas:events:notifications',
  WORKER_HEARTBEAT: 'saas:events:worker_heartbeat',
  SYSTEM_STATUS: 'saas:events:system_status',
} as const;

/**
 * Publishes an event to a Redis channel with fallback to local event emitter.
 */
export async function publishEvent<T = any>(channel: string, payload: T): Promise<number> {
  const serialized = JSON.stringify(payload);

  // Always emit to local listeners
  localEmitter.emit(channel, payload);

  if (isRedisReady()) {
    try {
      const receiversCount = await redisClient.publish(channel, serialized);
      return receiversCount;
    } catch (err: any) {
      console.warn(`[Redis Pub/Sub] Publish failed on channel ${channel}:`, err.message);
    }
  }

  return 1;
}

/**
 * Subscribes to a channel. Returns an unsubscribe function.
 */
export async function subscribeEvent<T = any>(
  channel: string,
  handler: (payload: T) => void
): Promise<() => void> {
  // Register in active subscriptions map
  let handlers = activeSubscriptions.get(channel);
  if (!handlers) {
    handlers = new Set();
    activeSubscriptions.set(channel, handlers);

    // If this is the first handler for this channel, subscribe on Redis client
    if (redisSubscriber.status === 'ready') {
      try {
        await redisSubscriber.subscribe(channel);
      } catch (err: any) {
        console.warn(`[Redis Pub/Sub] Subscribe failed on ${channel}:`, err.message);
      }
    }
  }
  handlers.add(handler);

  // Also bind to local emitter for non-Redis events
  localEmitter.on(channel, handler);

  // Return unsubscribe handler
  return () => {
    localEmitter.off(channel, handler);
    const set = activeSubscriptions.get(channel);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        activeSubscriptions.delete(channel);
        if (redisSubscriber.status === 'ready') {
          redisSubscriber.unsubscribe(channel).catch(() => {});
        }
      }
    }
  };
}
