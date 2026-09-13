import prisma from '../config/database.js';
import type { CreateAlarmInput, UpdateAlarmInput } from '../validators/alarm.js';
export type AlarmType = 'TIME' | 'LOCATION' | 'ARRIVAL' | 'COMMUTE';
export type AlarmStatus = 'IDLE' | 'ACTIVE' | 'TRACKING' | 'TRIGGERED' | 'SNOOZED' | 'COMPLETED' | 'DISABLED';

/**
 * Calculate the next ring time for a time-based alarm.
 */
function calculateNextRingTime(
  hour: number,
  minute: number,
  repeat: string = 'once',
  customDays: number[] = [],
  fromDate: Date = new Date()
): Date {
  const target = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate(),
    hour,
    minute,
    0,
    0
  );

  const nowMs = fromDate.getTime();

  if (repeat === 'once' || repeat === 'daily') {
    if (target.getTime() <= nowMs) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  if (repeat === 'weekdays') {
    while (target.getTime() <= nowMs || target.getDay() === 0 || target.getDay() === 6) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  if (repeat === 'weekends') {
    while (target.getTime() <= nowMs || (target.getDay() !== 0 && target.getDay() !== 6)) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  if (repeat === 'custom') {
    if (!customDays || customDays.length === 0) {
      if (target.getTime() <= nowMs) {
        target.setDate(target.getDate() + 1);
      }
      return target;
    }
    while (target.getTime() <= nowMs || !customDays.includes(target.getDay())) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  return target;
}

export async function createAlarm(userId: string, input: CreateAlarmInput) {
  let nextRingTime: Date | undefined;

  if (input.type === 'TIME' && input.hour !== undefined && input.minute !== undefined) {
    nextRingTime = calculateNextRingTime(
      input.hour,
      input.minute,
      input.repeatPattern,
      input.customDays
    );
  }

  const alarm = await prisma.alarm.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      type: input.type as AlarmType,
      targetLatitude: input.targetLatitude,
      targetLongitude: input.targetLongitude,
      targetAddress: input.targetAddress,
      radius: input.radius,
      hour: input.hour,
      minute: input.minute,
      repeatPattern: input.repeatPattern,
      customDays: input.customDays || [],
      sound: input.sound,
      volume: input.volume,
      vibration: input.vibration,
      notificationEnabled: input.notificationEnabled,
      enabled: input.enabled,
      snoozeMinutes: input.snoozeMinutes,
      maxSnoozeCount: input.maxSnoozeCount,
      durationSeconds: input.durationSeconds,
      autoStop: input.autoStop,
      batteryMode: input.batteryMode,
      earlyAlertEnabled: input.earlyAlertEnabled,
      earlyAlertDistance: input.earlyAlertDistance,
      nextRingTime,
    },
  });

  // Record creation in history
  await prisma.alarmHistory.create({
    data: {
      alarmId: alarm.id,
      userId,
      eventType: 'CREATED',
    },
  });

  return alarm;
}

export async function getUserAlarms(userId: string) {
  return prisma.alarm.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAlarmById(userId: string, alarmId: string) {
  const alarm = await prisma.alarm.findFirst({
    where: { id: alarmId, userId },
  });

  if (!alarm) {
    const error = new Error('Alarm not found') as Error & { statusCode: number; code: string };
    error.statusCode = 404;
    error.code = 'ALARM_NOT_FOUND';
    throw error;
  }

  return alarm;
}

export async function updateAlarm(userId: string, alarmId: string, input: UpdateAlarmInput) {
  // Verify ownership
  await getAlarmById(userId, alarmId);

  // Recalculate next ring time if time fields changed
  let nextRingTime: Date | undefined;
  if (input.hour !== undefined || input.minute !== undefined || input.repeatPattern !== undefined) {
    const current = await prisma.alarm.findUnique({ where: { id: alarmId } });
    if (current && current.type === 'TIME') {
      const hour = input.hour ?? current.hour ?? 0;
      const minute = input.minute ?? current.minute ?? 0;
      const repeat = input.repeatPattern ?? current.repeatPattern ?? 'once';
      const days = input.customDays ?? (current.customDays as number[]) ?? [];
      nextRingTime = calculateNextRingTime(hour, minute, repeat, days);
    }
  }

  return prisma.alarm.update({
    where: { id: alarmId },
    data: {
      ...input,
      ...(nextRingTime ? { nextRingTime } : {}),
    },
  });
}

export async function deleteAlarm(userId: string, alarmId: string) {
  await getAlarmById(userId, alarmId);
  await prisma.alarm.delete({ where: { id: alarmId } });
}

export async function enableAlarm(userId: string, alarmId: string) {
  const alarm = await getAlarmById(userId, alarmId);

  let nextRingTime: Date | undefined;
  if (alarm.type === 'TIME' && alarm.hour !== null && alarm.minute !== null) {
    nextRingTime = calculateNextRingTime(
      alarm.hour,
      alarm.minute,
      alarm.repeatPattern || 'once',
      alarm.customDays as number[]
    );
  }

  const updated = await prisma.alarm.update({
    where: { id: alarmId },
    data: {
      enabled: true,
      status: alarm.type === 'LOCATION' ? 'TRACKING' : 'ACTIVE',
      snoozeCount: 0,
      ...(nextRingTime ? { nextRingTime } : {}),
    },
  });

  await prisma.alarmHistory.create({
    data: {
      alarmId,
      userId,
      eventType: 'ENABLED',
    },
  });

  return updated;
}

export async function disableAlarm(userId: string, alarmId: string) {
  await getAlarmById(userId, alarmId);

  const updated = await prisma.alarm.update({
    where: { id: alarmId },
    data: {
      enabled: false,
      status: 'DISABLED',
    },
  });

  await prisma.alarmHistory.create({
    data: {
      alarmId,
      userId,
      eventType: 'DISABLED',
    },
  });

  return updated;
}

export async function snoozeAlarm(userId: string, alarmId: string, minutes: number = 5) {
  const alarm = await getAlarmById(userId, alarmId);

  if (alarm.snoozeCount >= alarm.maxSnoozeCount) {
    const error = new Error('Maximum snooze count reached') as Error & { statusCode: number; code: string };
    error.statusCode = 400;
    error.code = 'MAX_SNOOZE_REACHED';
    throw error;
  }

  const nextRingTime = new Date(Date.now() + minutes * 60 * 1000);

  const updated = await prisma.alarm.update({
    where: { id: alarmId },
    data: {
      status: 'SNOOZED',
      snoozeCount: { increment: 1 },
      nextRingTime,
    },
  });

  await prisma.alarmHistory.create({
    data: {
      alarmId,
      userId,
      eventType: 'SNOOZED',
      metadata: { minutes, snoozeCount: updated.snoozeCount },
    },
  });

  return updated;
}

export async function stopAlarm(userId: string, alarmId: string, latitude?: number, longitude?: number) {
  const alarm = await getAlarmById(userId, alarmId);

  // For one-time alarms, disable after stop
  const isOneTime = alarm.repeatPattern === 'once';

  let nextRingTime: Date | undefined;
  if (!isOneTime && alarm.type === 'TIME' && alarm.hour !== null && alarm.minute !== null) {
    // Calculate next ring from 1 minute from now (to avoid re-triggering)
    nextRingTime = calculateNextRingTime(
      alarm.hour,
      alarm.minute,
      alarm.repeatPattern || 'once',
      alarm.customDays as number[],
      new Date(Date.now() + 60000)
    );
  }

  const updated = await prisma.alarm.update({
    where: { id: alarmId },
    data: {
      status: isOneTime ? 'COMPLETED' : 'IDLE',
      enabled: isOneTime ? false : alarm.enabled,
      snoozeCount: 0,
      triggeredAt: new Date(),
      ...(nextRingTime ? { nextRingTime } : {}),
    },
  });

  await prisma.alarmHistory.create({
    data: {
      alarmId,
      userId,
      eventType: 'STOPPED',
      latitude,
      longitude,
      metadata: {
        destinationName: alarm.title,
        address: alarm.targetAddress,
        radius: alarm.radius,
      },
    },
  });

  return updated;
}

export async function triggerAlarm(userId: string, alarmId: string, latitude?: number, longitude?: number) {
  await getAlarmById(userId, alarmId);

  const updated = await prisma.alarm.update({
    where: { id: alarmId },
    data: {
      status: 'TRIGGERED',
      triggeredAt: new Date(),
    },
  });

  await prisma.alarmHistory.create({
    data: {
      alarmId,
      userId,
      eventType: 'TRIGGERED',
      latitude,
      longitude,
    },
  });

  return updated;
}

/**
 * Get all enabled time alarms that are due to ring.
 * Used by the scheduler service.
 */
export async function getDueTimeAlarms(): Promise<any[]> {
  return prisma.alarm.findMany({
    where: {
      type: 'TIME',
      enabled: true,
      status: { in: ['ACTIVE', 'IDLE', 'SNOOZED'] },
      nextRingTime: { lte: new Date() },
    },
    include: {
      user: {
        select: { id: true, email: true, timezone: true },
      },
    },
  });
}
