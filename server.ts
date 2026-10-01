import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import authRoutes from './server/routes/auth.js';
import publicRoutes from './server/routes/public.js';
import customerRoutes from './server/routes/customer.js';
import adminRoutes from './server/routes/admin.js';
import workerRoutes from './server/routes/worker.js';
import webhookRoutes from './server/routes/webhooks.js';
import billingRoutes from './server/routes/billing.js';
import { db } from './server/db/store.js';
import { pool } from './src/db/index.js';
import { 
  ensureRedisDaemon, 
  initRedis, 
  getRedisHealth, 
  startQueueWorker, 
  enqueueJob, 
  getJob, 
  getQueueStats 
} from './server/redis/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Configure Production Cross-Origin Resource Sharing (CORS)
  // Strictly authorizes Cloudflare Pages frontend, custom domains, and local preview environments.
  const allowedOrigins = [
  'https://forex-mt5-automated-trading.pages.dev',
  'https://forex-mt5-api.onrender.com',
    process.env.FRONTEND_CUSTOMER_URL,
    process.env.FRONTEND_ADMIN_URL,
    process.env.APP_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173',
  ].filter(Boolean) as string[];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith('.pages.dev') ||
        origin.endsWith('.run.app');
        
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'idempotency-key'],
  }));

  // Initialize PostgreSQL connection and state
  try {
    await db.initPostgres();
  } catch (dbErr) {
    console.error('PostgreSQL initialization warning:', dbErr);
  }

  // Initialize Redis daemon, client connection, and background queue worker
  try {
    await ensureRedisDaemon();
    await initRedis();
    startQueueWorker();
  } catch (redisErr) {
    console.warn('Redis initialization warning:', redisErr);
  }

  // Middleware for body parsing (capturing rawBody for Stripe Webhook signature verification)
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ extended: true }));

  // Production Root Health check (GET /health)
  app.get('/health', async (_req, res) => {
    let pgStatus = 'disconnected';
    try {
      const dbCheck = await pool.query('SELECT 1 as live;');
      if (dbCheck?.rows?.length) {
        pgStatus = 'connected';
      }
    } catch {
      pgStatus = 'disconnected';
    }

    let redisStatus = 'Not configured';
    try {
      const redisHealth = await getRedisHealth();
      redisStatus = redisHealth.status;
    } catch {
      redisStatus = 'Unavailable';
    }

    res.json({
      status: 'healthy',
      service: 'Forex MT5 Automated Trading SaaS API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      postgres: pgStatus,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    });
  });

  // API Overall Health check
  app.get('/api/health', async (_req, res) => {
    let pgStatus = 'disconnected';
    try {
      const dbCheck = await pool.query('SELECT 1 as live;');
      if (dbCheck?.rows?.length) {
        pgStatus = 'connected';
      }
    } catch {
      pgStatus = 'disconnected';
    }

    let redisStatus = 'Not configured';
    try {
      const redisHealth = await getRedisHealth();
      redisStatus = redisHealth.status;
    } catch {
      redisStatus = 'Unavailable';
    }

    res.json({
      status: 'healthy',
      service: 'Forex MT5 Automated Trading SaaS API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      postgres: pgStatus,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    });
  });

  // Database Health check
  app.get('/api/health/db', async (req, res) => {
    try {
      const dbCheck = await pool.query('SELECT NOW() as current_time, current_database() as database, count(*)::int as user_count FROM users;');
      res.json({
        status: 'connected',
        database: dbCheck.rows[0].database,
        currentTime: dbCheck.rows[0].current_time,
        registeredUsers: dbCheck.rows[0].user_count,
        cachedStoreUsers: db.users.length,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        message: err.message,
      });
    }
  });

  // Redis Health check
  app.get('/api/health/redis', async (req, res) => {
    try {
      const health = await getRedisHealth();
      const queueStats = await getQueueStats();
      res.json({
        ...health,
        queue: queueStats,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        message: err.message,
      });
    }
  });

  // Test Queue Job Dispatcher
  app.post('/api/queue/test-job', async (req, res) => {
    try {
      const payload = req.body || { message: 'Redis queue self-test' };
      const job = await enqueueJob('test:ping', payload);
      res.status(202).json({
        message: 'Job enqueued successfully',
        job,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Check Job Status
  app.get('/api/queue/jobs/:id', async (req, res) => {
    try {
      const job = await getJob(req.params.id);
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      res.json({ job });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mount API modules
  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/customer', customerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/worker', workerRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/billing', billingRoutes);

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      error: 'An internal server error occurred.',
      code: 'ERR_INTERNAL_SERVER',
    });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Forex MT5 SaaS Server running on http://0.0.0.0:${PORT}`);
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`[Server] Received ${signal}. Gracefully terminating service...`);
    server.close(async () => {
      try {
        await pool.end();
      } catch {}
      console.log('[Server] Database pool and HTTP listeners closed. Process terminated cleanly.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
