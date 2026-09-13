import { Router } from 'express';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.js';
import * as authService from '../services/authService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { getEnv, isProd } from '../config/env.js';

import crypto from 'crypto';
import logger from '../config/logger.js';

const router = Router();

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: isProd() ? ('none' as const) : ('lax' as const),
  maxAge,
  path: '/',
});

function getBaseUrl(req: any): string {
  const env = getEnv();
  if (env.FRONTEND_URL && env.FRONTEND_URL.startsWith('http')) {
    return env.FRONTEND_URL.replace(/\/$/, '');
  }
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:5173';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${host}`;
}

function getCallbackUrl(req: any): string {
  const env = getEnv();
  if (env.GOOGLE_CALLBACK_URL && env.GOOGLE_CALLBACK_URL.startsWith('http')) {
    return env.GOOGLE_CALLBACK_URL;
  }
  const baseUrl = getBaseUrl(req);
  return `${baseUrl}/api/auth/google/callback`;
}

// POST /api/auth/register
router.post('/register', authLimiter, validate({ body: registerSchema }), async (req, res, next) => {
  try {
    const { user, tokens } = await authService.registerUser(req.body);

    res.cookie('access_token', tokens.accessToken, cookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', tokens.refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));

    sendSuccess(res, { user }, 201);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const { user, tokens } = await authService.loginUser(req.body);

    res.cookie('access_token', tokens.accessToken, cookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', tokens.refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));

    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
  sendSuccess(res, { message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = await authService.getUserById(req.userId!);
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }
    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate({ body: forgotPasswordSchema }),
  async (req, res, next) => {
    try {
      await authService.createPasswordResetToken(req.body.email);
      // Always return success to prevent email enumeration
      sendSuccess(res, { message: 'If the email exists, a reset link has been sent.' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  async (req, res, next) => {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      sendSuccess(res, { message: 'Password has been reset successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/auth/google — Redirect to Google OAuth
router.get('/google', (req, res) => {
  const env = getEnv();
  const frontendUrl = getBaseUrl(req);

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    logger.warn('Google OAuth login attempted but client credentials are not configured.');
    return res.redirect(`${frontendUrl}?error=OAUTH_NOT_CONFIGURED`);
  }

  // CSRF protection state
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? ('none' as const) : ('lax' as const),
    maxAge: 10 * 60 * 1000,
    path: '/',
  });

  const callbackUrl = getCallbackUrl(req);

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /api/auth/google/callback — Handle Google OAuth callback
router.get('/google/callback', async (req, res, next) => {
  const frontendUrl = getBaseUrl(req);
  try {
    const { code, state, error: googleError } = req.query;

    if (googleError) {
      logger.warn({ googleError }, 'Google OAuth returned an error');
      return res.redirect(`${frontendUrl}?error=${encodeURIComponent(String(googleError))}`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${frontendUrl}?error=INVALID_CODE`);
    }

    // Validate CSRF state token
    const savedState = req.cookies?.oauth_state;
    res.clearCookie('oauth_state', { path: '/' });

    if (!savedState || !state || savedState !== state) {
      logger.error('Google OAuth state mismatch (possible CSRF attack)');
      return res.redirect(`${frontendUrl}?error=CSRF_STATE_MISMATCH`);
    }

    const env = getEnv();
    const callbackUrl = getCallbackUrl(req);

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      logger.error({ errText }, 'Failed to exchange Google authorization code');
      return res.redirect(`${frontendUrl}?error=OAUTH_TOKEN_FAILED`);
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    // Get user profile
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      logger.error('Failed to fetch user profile from Google');
      return res.redirect(`${frontendUrl}?error=OAUTH_USERINFO_FAILED`);
    }

    const profile = (await userInfoRes.json()) as {
      id: string;
      email: string;
      name: string;
      picture?: string;
    };

    const { user, tokens } = await authService.findOrCreateGoogleUser({
      googleId: profile.id,
      email: profile.email,
      name: profile.name,
      avatar: profile.picture,
    });

    res.cookie('access_token', tokens.accessToken, cookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', tokens.refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));

    res.redirect(`${frontendUrl}?auth=success`);
  } catch (error: any) {
    logger.error({ error: error?.message || error }, 'Unhandled error in Google OAuth callback');
    res.redirect(`${frontendUrl}?error=OAUTH_FAILED`);
  }
});

export default router;
