import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Timing-safe string comparison to protect against timing attacks.
 */
function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Middleware to authenticate requests from external MT5 Python workers.
 * Accepts the secret via either:
 *   - 'x-worker-secret' header
 *   - 'Authorization: Bearer <secret>' header
 * 
 * Compares against process.env.MT5_WORKER_SECRET using timing-safe comparison.
 * Never logs secrets or returns secret tokens in response bodies.
 */
export function requireWorkerAuth(req: Request, res: Response, next: NextFunction): void {
  const configuredSecret = process.env.MT5_WORKER_SECRET;

  if (!configuredSecret) {
    // If not configured in environment, disallow access in production for safety
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({
        error: 'MT5 worker authentication is unconfigured on the server.',
        code: 'ERR_WORKER_AUTH_UNCONFIGURED',
      });
      return;
    }
  }

  // Extract from x-worker-secret header
  let providedSecret = req.headers['x-worker-secret'] as string | undefined;

  // Alternatively extract from Authorization: Bearer <secret>
  if (!providedSecret) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      providedSecret = authHeader.substring(7).trim();
    }
  }

  if (!providedSecret) {
    res.status(401).json({
      error: 'Authentication failed. Missing MT5 worker secret header.',
      code: 'ERR_WORKER_UNAUTHORIZED',
    });
    return;
  }

  const targetSecret = configuredSecret || 'mt5_dev_worker_secret_fallback_key';

  if (!timingSafeCompare(providedSecret, targetSecret)) {
    res.status(403).json({
      error: 'Access denied. Invalid MT5 worker secret.',
      code: 'ERR_WORKER_FORBIDDEN',
    });
    return;
  }

  next();
}
