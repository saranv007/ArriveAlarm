import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, signAccessToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';
import prisma from '../config/database.js';

export interface AuthenticatedRequest<P = Record<string, string>> extends Request<P> {
  userId?: string;
  userEmail?: string;
}

/**
 * JWT authentication middleware.
 * Checks for access token in cookie or Authorization header.
 * Attempts silent refresh if access token is expired but refresh token is valid.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try cookie first, then Authorization header
    let accessToken = req.cookies?.access_token;
    if (!accessToken) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        accessToken = authHeader.slice(7);
      }
    }

    if (accessToken) {
      try {
        const payload = verifyAccessToken(accessToken);
        req.userId = payload.userId;
        req.userEmail = payload.email;
        next();
        return;
      } catch {
        // Access token expired — try refresh
      }
    }

    // Attempt silent refresh using refresh token cookie
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);

        // Verify user still exists
        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (user) {
          // Issue new access token
          const newAccessToken = signAccessToken({ userId: user.id, email: user.email });
          const isHttps = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production' || req.secure || req.get('x-forwarded-proto') === 'https';
          res.cookie('access_token', newAccessToken, {
            httpOnly: true,
            secure: isHttps,
            sameSite: isHttps ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: '/',
          });

          req.userId = user.id;
          req.userEmail = user.email;
          next();
          return;
        }
      } catch {
        // Refresh token also invalid
      }
    }

    sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
  } catch (error) {
    sendError(res, 'AUTH_ERROR', 'Authentication failed', 401);
  }
}

/**
 * Optional auth — sets userId if token is valid, but doesn't reject if missing.
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let accessToken = req.cookies?.access_token;
    if (!accessToken) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        accessToken = authHeader.slice(7);
      }
    }

    if (accessToken) {
      const payload = verifyAccessToken(accessToken);
      req.userId = payload.userId;
      req.userEmail = payload.email;
    }
  } catch {
    // Token invalid — proceed without auth
  }

  next();
}
