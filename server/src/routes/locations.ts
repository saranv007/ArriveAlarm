import { Router } from 'express';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createLocationSchema, updateLocationSchema, locationIdParam } from '../validators/location.js';
import * as locationService from '../services/locationService.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

router.use(requireAuth);

// GET /api/locations
router.get('/', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const locations = await locationService.getUserLocations(req.userId!);
    sendSuccess(res, { locations });
  } catch (error) {
    next(error);
  }
});

// POST /api/locations
router.post('/', validate({ body: createLocationSchema }), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const location = await locationService.createLocation(req.userId!, req.body);
    sendSuccess(res, { location }, 201);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/locations/:id
router.patch(
  '/:id',
  validate({ params: locationIdParam, body: updateLocationSchema }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const location = await locationService.updateLocation(req.userId!, req.params.id, req.body);
      sendSuccess(res, { location });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/locations/:id
router.delete(
  '/:id',
  validate({ params: locationIdParam }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      await locationService.deleteLocation(req.userId!, req.params.id);
      sendSuccess(res, { message: 'Location deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
