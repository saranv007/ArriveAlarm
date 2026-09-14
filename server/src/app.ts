import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { getEnv } from './config/env.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import alarmRoutes from './routes/alarms.js';
import locationRoutes from './routes/locations.js';
import historyRoutes from './routes/history.js';
import notificationRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';

export function createApp() {
  const app = express();
  const env = getEnv();

  // ─── Security ────────────────────────────────────────
  app.use(helmet());

  // ─── CORS ────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        const frontendUrl = env.FRONTEND_URL?.replace(/\/$/, '');

        // Allow same-origin / no-origin (server-to-server, curl, Vercel functions)
        if (!origin) {
          return callback(null, true);
        }

        // If FRONTEND_URL is not configured, allow all origins (dev/unset scenario)
        if (!frontendUrl) {
          return callback(null, true);
        }

        // Allow the configured frontend URL
        if (origin === frontendUrl) {
          return callback(null, true);
        }

        // Allow all Vercel preview deployments for this project
        if (origin.match(/^https:\/\/arrive-alarm[a-z0-9-]*\.vercel\.app$/)) {
          return callback(null, true);
        }

        // Allow localhost for development
        if (origin.match(/^http:\/\/localhost(:\d+)?$/) || origin.match(/^http:\/\/127\.0\.0\.1(:\d+)?$/)) {
          return callback(null, true);
        }

        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );


  // ─── Body Parsing ────────────────────────────────────
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());

  // ─── Rate Limiting ───────────────────────────────────
  app.use('/api', generalLimiter);

  // ─── Health Check ────────────────────────────────────
  app.get(['/api/health', '/health'], (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  });

  // ─── Routes ──────────────────────────────────────────
  app.use(['/api/auth', '/auth'], authRoutes);
  app.use(['/api/users', '/users'], userRoutes);
  app.use(['/api/alarms', '/alarms'], alarmRoutes);
  app.use(['/api/locations', '/locations'], locationRoutes);
  app.use(['/api/history', '/history'], historyRoutes);
  app.use(['/api/notifications', '/notifications'], notificationRoutes);
  app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);

  // ─── 404 Handler ─────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested API endpoint does not exist',
      },
    });
  });

  // ─── Global Error Handler ────────────────────────────
  app.use(errorHandler);

  return app;
}

