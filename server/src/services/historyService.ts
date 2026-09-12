import prisma from '../config/database.js';

export async function getUserHistory(userId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.alarmHistory.findMany({
      where: { userId },
      orderBy: { triggeredAt: 'desc' },
      skip,
      take: limit,
      include: {
        alarm: {
          select: {
            title: true,
            targetAddress: true,
            targetLatitude: true,
            targetLongitude: true,
            radius: true,
            type: true,
          },
        },
      },
    }),
    prisma.alarmHistory.count({ where: { userId } }),
  ]);

  return { items, total, page, limit };
}

export async function getAlarmHistory(userId: string, alarmId: string, page: number = 1, limit: number = 20) {
  // Verify the alarm belongs to the user
  const alarm = await prisma.alarm.findFirst({ where: { id: alarmId, userId } });
  if (!alarm) {
    const error = new Error('Alarm not found') as Error & { statusCode: number; code: string };
    error.statusCode = 404;
    error.code = 'ALARM_NOT_FOUND';
    throw error;
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.alarmHistory.findMany({
      where: { alarmId, userId },
      orderBy: { triggeredAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.alarmHistory.count({ where: { alarmId, userId } }),
  ]);

  return { items, total, page, limit };
}

export async function clearUserHistory(userId: string): Promise<void> {
  await prisma.alarmHistory.deleteMany({ where: { userId } });
}

export async function deleteHistoryEntry(userId: string, entryId: string): Promise<void> {
  const entry = await prisma.alarmHistory.findFirst({ where: { id: entryId, userId } });
  if (!entry) {
    const error = new Error('History entry not found') as Error & { statusCode: number; code: string };
    error.statusCode = 404;
    error.code = 'HISTORY_NOT_FOUND';
    throw error;
  }
  await prisma.alarmHistory.delete({ where: { id: entryId } });
}
