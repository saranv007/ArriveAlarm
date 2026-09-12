import { Router } from 'express';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateUserSchema, updateSettingsSchema } from '../validators/common.js';
import * as authService from '../services/authService.js';
import prisma from '../config/database.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// All user routes require authentication
router.use(requireAuth);

// GET /api/users/me
router.get('/me', async (req: AuthenticatedRequest, res: Response, next) => {
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

// PATCH /api/users/me
router.patch('/me', validate({ body: updateUserSchema }), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = await authService.updateUser(req.userId!, req.body);
    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/me
router.delete('/me', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    await authService.deleteUser(req.userId!);
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    sendSuccess(res, { message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/me/settings
router.get('/me/settings', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    let settings = await prisma.userSettings.findUnique({
      where: { userId: req.userId! },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId: req.userId! },
      });
    }

    sendSuccess(res, { settings });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/me/settings
router.patch(
  '/me/settings',
  validate({ body: updateSettingsSchema }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const settings = await prisma.userSettings.upsert({
        where: { userId: req.userId! },
        update: req.body,
        create: { userId: req.userId!, ...req.body },
      });

      sendSuccess(res, { settings });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
