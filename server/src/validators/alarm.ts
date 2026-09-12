import { z } from 'zod';

const alarmTypeEnum = z.enum(['TIME', 'LOCATION', 'ARRIVAL', 'COMMUTE']);
const repeatPatternEnum = z.enum(['once', 'daily', 'weekdays', 'weekends', 'custom']);

export const createAlarmSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(500).optional(),
  type: alarmTypeEnum,

  // Location fields
  targetLatitude: z.number().min(-90).max(90).optional(),
  targetLongitude: z.number().min(-180).max(180).optional(),
  targetAddress: z.string().max(500).optional(),
  radius: z.number().min(50).max(50000).optional(),

  // Time fields
  hour: z.number().min(0).max(23).optional(),
  minute: z.number().min(0).max(59).optional(),
  repeatPattern: repeatPatternEnum.optional().default('once'),
  customDays: z.array(z.number().min(0).max(6)).optional().default([]),

  // Configuration
  sound: z.string().max(50).optional().default('classic'),
  volume: z.number().min(0).max(100).optional().default(80),
  vibration: z.boolean().optional().default(true),
  notificationEnabled: z.boolean().optional().default(true),
  enabled: z.boolean().optional().default(true),
  snoozeMinutes: z.number().min(1).max(60).optional().default(5),
  maxSnoozeCount: z.number().min(1).max(10).optional().default(3),
  durationSeconds: z.number().min(0).max(300).optional().default(30),
  autoStop: z.boolean().optional().default(true),
  batteryMode: z.string().optional().default('normal'),

  // Early alert
  earlyAlertEnabled: z.boolean().optional().default(false),
  earlyAlertDistance: z.number().min(100).max(50000).optional().default(1000),
}).refine(
  (data) => {
    // Location alarms must have coordinates
    if (data.type === 'LOCATION' || data.type === 'ARRIVAL' || data.type === 'COMMUTE') {
      return data.targetLatitude !== undefined && data.targetLongitude !== undefined;
    }
    return true;
  },
  { message: 'Location alarms require targetLatitude and targetLongitude', path: ['targetLatitude'] }
).refine(
  (data) => {
    // Time alarms must have hour and minute
    if (data.type === 'TIME') {
      return data.hour !== undefined && data.minute !== undefined;
    }
    return true;
  },
  { message: 'Time alarms require hour and minute', path: ['hour'] }
);

export const updateAlarmSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  targetLatitude: z.number().min(-90).max(90).optional(),
  targetLongitude: z.number().min(-180).max(180).optional(),
  targetAddress: z.string().max(500).optional(),
  radius: z.number().min(50).max(50000).optional(),
  hour: z.number().min(0).max(23).optional(),
  minute: z.number().min(0).max(59).optional(),
  repeatPattern: repeatPatternEnum.optional(),
  customDays: z.array(z.number().min(0).max(6)).optional(),
  sound: z.string().max(50).optional(),
  volume: z.number().min(0).max(100).optional(),
  vibration: z.boolean().optional(),
  notificationEnabled: z.boolean().optional(),
  enabled: z.boolean().optional(),
  snoozeMinutes: z.number().min(1).max(60).optional(),
  maxSnoozeCount: z.number().min(1).max(10).optional(),
  durationSeconds: z.number().min(0).max(300).optional(),
  autoStop: z.boolean().optional(),
  batteryMode: z.string().optional(),
  earlyAlertEnabled: z.boolean().optional(),
  earlyAlertDistance: z.number().min(100).max(50000).optional(),
});

export const snoozeAlarmSchema = z.object({
  minutes: z.number().min(1).max(60).optional().default(5),
});

export const alarmIdParam = z.object({
  id: z.string().uuid('Invalid alarm ID'),
});

export type CreateAlarmInput = z.infer<typeof createAlarmSchema>;
export type UpdateAlarmInput = z.infer<typeof updateAlarmSchema>;
