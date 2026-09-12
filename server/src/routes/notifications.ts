import { Router } from 'express';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { pushSubscriptionSchema } from '../validators/common.js';
import * as notificationService from '../services/notificationService.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

router.use(requireAuth);

// GET /api/notifications/vapid-public-key
router.get('/vapid-public-key', (_req, res: Response) => {
  const key = notificationService.getVapidPublicKey();
  sendSuccess(res, { publicKey: key });
});

// POST /api/notifications/subscribe
router.post(
  '/subscribe',
  validate({ body: pushSubscriptionSchema }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { endpoint, keys } = req.body;
      await notificationService.saveSubscription(req.userId!, endpoint, keys.p256dh, keys.auth);
      sendSuccess(res, { message: 'Push subscription saved' }, 201);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/notifications/unsubscribe
router.post('/unsubscribe', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await notificationService.removeSubscription(req.userId!, endpoint);
    } else {
      await notificationService.removeAllSubscriptions(req.userId!);
    }
    sendSuccess(res, { message: 'Unsubscribed from push notifications' });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/test
router.post('/test', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    await notificationService.sendTestNotification(req.userId!);
    sendSuccess(res, { message: 'Test notification sent' });
  } catch (error) {
    next(error);
  }
});

export default router;
