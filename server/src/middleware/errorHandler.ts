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
  const code = err.code || 'INTERNAL_ERROR';
  const message = isProd() && statusCode === 500
    ? 'An unexpected error occurred'
    : err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
