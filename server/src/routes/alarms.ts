import { Router } from 'express';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createAlarmSchema, updateAlarmSchema, snoozeAlarmSchema, alarmIdParam } from '../validators/alarm.js';
import * as alarmService from '../services/alarmService.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// All alarm routes require authentication
router.use(requireAuth);

// GET /api/alarms — List user's alarms
router.get('/', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const alarms = await alarmService.getUserAlarms(req.userId!);
    sendSuccess(res, { alarms });
  } catch (error) {
    next(error);
  }
});

// POST /api/alarms — Create alarm
router.post('/', validate({ body: createAlarmSchema }), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const alarm = await alarmService.createAlarm(req.userId!, req.body);
    sendSuccess(res, { alarm }, 201);
  } catch (error) {
    next(error);
  }
});

// GET /api/alarms/:id — Get single alarm
router.get('/:id', validate({ params: alarmIdParam }), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const alarm = await alarmService.getAlarmById(req.userId!, req.params.id);
    sendSuccess(res, { alarm });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/alarms/:id — Update alarm
router.patch(
  '/:id',
  validate({ params: alarmIdParam, body: updateAlarmSchema }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const alarm = await alarmService.updateAlarm(req.userId!, req.params.id, req.body);
      sendSuccess(res, { alarm });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/alarms/:id — Delete alarm
router.delete('/:id', validate({ params: alarmIdParam }), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    await alarmService.deleteAlarm(req.userId!, req.params.id);
    sendSuccess(res, { message: 'Alarm deleted' });
  } catch (error) {
    next(error);
  }
});

// POST /api/alarms/:id/enable
router.post(
  '/:id/enable',
  validate({ params: alarmIdParam }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const alarm = await alarmService.enableAlarm(req.userId!, req.params.id);
      sendSuccess(res, { alarm });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/alarms/:id/disable
router.post(
  '/:id/disable',
  validate({ params: alarmIdParam }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const alarm = await alarmService.disableAlarm(req.userId!, req.params.id);
      sendSuccess(res, { alarm });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/alarms/:id/snooze
router.post(
  '/:id/snooze',
  validate({ params: alarmIdParam, body: snoozeAlarmSchema }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const alarm = await alarmService.snoozeAlarm(req.userId!, req.params.id, req.body.minutes);
      sendSuccess(res, { alarm });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/alarms/:id/stop
router.post(
  '/:id/stop',
  validate({ params: alarmIdParam }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { latitude, longitude } = req.body || {};
      const alarm = await alarmService.stopAlarm(req.userId!, req.params.id, latitude, longitude);
      sendSuccess(res, { alarm });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/alarms/:id/trigger — Client reports alarm triggered (location arrival)
router.post(
  '/:id/trigger',
  validate({ params: alarmIdParam }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { latitude, longitude } = req.body || {};
      const alarm = await alarmService.triggerAlarm(req.userId!, req.params.id, latitude, longitude);
      sendSuccess(res, { alarm });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
