import prisma from '../config/database.js';

interface DashboardStats {
  totalAlarms: number;
  activeAlarms: number;
  timeAlarms: number;
  locationAlarms: number;
  alarmsTriggered: number;
  alarmsSnoozed: number;
  alarmsStopped: number;
  totalSavedPlaces: number;
  mostUsedDestination: string | null;
  weeklyActivity: Array<{ day: string; count: number }>;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [
    totalAlarms,
    activeAlarms,
    timeAlarms,
    locationAlarms,
    alarmsTriggered,
    alarmsSnoozed,
    alarmsStopped,
    totalSavedPlaces,
    topDestination,
    recentHistory,
  ] = await Promise.all([
    prisma.alarm.count({ where: { userId } }),
    prisma.alarm.count({ where: { userId, enabled: true } }),
    prisma.alarm.count({ where: { userId, type: 'TIME' } }),
    prisma.alarm.count({ where: { userId, type: { in: ['LOCATION', 'ARRIVAL', 'COMMUTE'] } } }),
    prisma.alarmHistory.count({ where: { userId, eventType: 'TRIGGERED' } }),
    prisma.alarmHistory.count({ where: { userId, eventType: 'SNOOZED' } }),
    prisma.alarmHistory.count({ where: { userId, eventType: 'STOPPED' } }),
    prisma.location.count({ where: { userId } }),
    // Most triggered alarm (top destination)
    prisma.alarmHistory.groupBy({
      by: ['alarmId'],
      where: { userId, eventType: 'TRIGGERED' },
      _count: { alarmId: true },
      orderBy: { _count: { alarmId: 'desc' } },
      take: 1,
    }),
    // Last 7 days of activity
    prisma.alarmHistory.findMany({
      where: {
        userId,
        triggeredAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { triggeredAt: true },
    }),
  ]);

  // Resolve top destination name
  let mostUsedDestination: string | null = null;
  if (topDestination.length > 0) {
    const alarm = await prisma.alarm.findUnique({
      where: { id: topDestination[0].alarmId },
      select: { title: true },
    });
    mostUsedDestination = alarm?.title || null;
  }

  // Build weekly activity
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyMap: Record<string, number> = {};
  dayNames.forEach((d) => (weeklyMap[d] = 0));
  recentHistory.forEach((entry) => {
    const dayName = dayNames[new Date(entry.triggeredAt).getDay()];
    weeklyMap[dayName] = (weeklyMap[dayName] || 0) + 1;
  });
  const weeklyActivity = dayNames.map((day) => ({ day, count: weeklyMap[day] }));

  return {
    totalAlarms,
    activeAlarms,
    timeAlarms,
    locationAlarms,
    alarmsTriggered,
    alarmsSnoozed,
    alarmsStopped,
    totalSavedPlaces,
    mostUsedDestination,
    weeklyActivity,
  };
}
