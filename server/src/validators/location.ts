import { z } from 'zod';

const locationTypeEnum = z.enum(['HOME', 'WORK', 'SCHOOL', 'CUSTOM']);

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  type: locationTypeEnum.optional().default('CUSTOM'),
  defaultRadius: z.number().min(50).max(50000).optional().default(200),
  earlyAlertEnabled: z.boolean().optional().default(false),
  earlyAlertDistance: z.number().min(100).max(50000).optional().default(1000),
});

export const updateLocationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  type: locationTypeEnum.optional(),
  defaultRadius: z.number().min(50).max(50000).optional(),
  earlyAlertEnabled: z.boolean().optional(),
  earlyAlertDistance: z.number().min(100).max(50000).optional(),
});

export const locationIdParam = z.object({
  id: z.string().uuid('Invalid location ID'),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
