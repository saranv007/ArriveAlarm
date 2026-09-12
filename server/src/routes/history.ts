import { Router } from 'express';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { paginationQuery, alarmIdParam, idParam } from '../validators/common.js';
import * as historyService from '../services/historyService.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';

const router = Router();

router.use(requireAuth);

// GET /api/history — Paginated alarm history
router.get('/', validate({ query: paginationQuery }), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const result = await historyService.getUserHistory(req.userId!, page, limit);
    sendPaginated(res, result.items, result.total, result.page, result.limit);
  } catch (error) {
    next(error);
  }
});

// GET /api/history/alarm/:alarmId — History for specific alarm
router.get(
  '/alarm/:alarmId',
  validate({ params: alarmIdParam, query: paginationQuery }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const result = await historyService.getAlarmHistory(req.userId!, req.params.alarmId, page, limit);
      sendPaginated(res, result.items, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/history — Clear all history
router.delete('/', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    await historyService.clearUserHistory(req.userId!);
    sendSuccess(res, { message: 'History cleared' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/history/:id — Delete single history entry
router.delete('/:id', validate({ params: idParam }), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    await historyService.deleteHistoryEntry(req.userId!, req.params.id);
    sendSuccess(res, { message: 'History entry deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
