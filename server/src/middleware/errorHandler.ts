import type { Request, Response, NextFunction } from 'express';
import { isProd } from '../config/env.js';
import logger from '../config/logger.js';

/**
 * Global error handling middleware. Must be registered last.
 */
export function errorHandler(
  err: Error & { statusCode?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');

  const statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';

  if (isProd() && statusCode === 500) {
    if (
      err.message?.includes("Can't reach database server") ||
      err.message?.includes('ECONNREFUSED') ||
      err.name === 'PrismaClientInitializationError' ||
      err.name === 'PrismaClientKnownRequestError'
    ) {
      code = 'DATABASE_ERROR';
      message = 'Database connection failed. Please ensure DATABASE_URL is set in Vercel Environment Variables.';
    } else {
      message = 'An unexpected error occurred';
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
