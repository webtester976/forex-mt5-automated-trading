import { exec } from 'child_process';
import net from 'net';

/**
 * Checks if a TCP port is open.
 */
function isPortOpen(host: string, port: number, timeoutMs = 600): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Ensures a local redis-server daemon is running if REDIS_URL targets localhost / 127.0.0.1.
 */
export async function ensureRedisDaemon(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return;
  }

  // Only auto-start daemon if the URL points to localhost or 127.0.0.1
  const isLocal = redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1');
  if (!isLocal) {
    return;
  }

  // Parse port from URL (default 6379)
  let port = 6379;
  try {
    const parsed = new URL(redisUrl);
    if (parsed.port) port = parseInt(parsed.port, 10);
  } catch {
    port = 6379;
  }

  const alreadyRunning = await isPortOpen('127.0.0.1', port);
  if (alreadyRunning) {
    return;
  }

  console.log(`[Redis] Port ${port} not answering. Attempting to start local redis-server daemon...`);

  return new Promise<void>((resolve) => {
    exec('redis-server --daemonize yes', (error, stdout, stderr) => {
      if (error) {
        console.warn('[Redis] Note: Unable to auto-launch redis-server daemon:', error.message);
      } else {
        console.log('[Redis] Local redis-server daemon started successfully.');
      }
      resolve();
    });
  });
}
