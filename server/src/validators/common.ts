import { z } from 'zod';

export const paginationQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const idParam = z.object({
  id: z.string().uuid('Invalid ID'),
});

export const alarmIdParam = z.object({
  alarmId: z.string().uuid('Invalid alarm ID'),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().max(50).optional(),
  units: z.string().max(20).optional(),
  avatar: z.string().url().max(500).optional().nullable(),
});

export const updateSettingsSchema = z.object({
  defaultRadius: z.number().min(50).max(50000).optional(),
  defaultSound: z.string().max(50).optional(),
  defaultVolume: z.number().min(0).max(100).optional(),
  defaultSnooze: z.number().min(1).max(60).optional(),
  defaultVibration: z.boolean().optional(),
  defaultDurationSeconds: z.number().min(0).max(300).optional(),
  notificationsEnabled: z.boolean().optional(),
  locationEnabled: z.boolean().optional(),
  darkMode: z.boolean().optional(),
  units: z.string().max(20).optional(),
  timezone: z.string().max(50).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  batteryMode: z.string().max(20).optional(),
  autoStop: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
