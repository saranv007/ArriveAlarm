import { Router } from 'express';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import * as statsService from '../services/statsService.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

router.use(requireAuth);

// GET /api/dashboard/stats
router.get('/stats', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const stats = await statsService.getDashboardStats(req.userId!);
    sendSuccess(res, { stats });
  } catch (error) {
    next(error);
  }
});

export default router;
