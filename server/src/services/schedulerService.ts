import cron from 'node-cron';
import { getDueTimeAlarms, triggerAlarm } from './alarmService.js';
import { sendPushToUser } from './notificationService.js';
import logger from '../config/logger.js';

let schedulerTask: ReturnType<typeof cron.schedule> | null = null;

/**
 * Start the alarm scheduler.
 * Checks every 30 seconds for time alarms that are due to ring.
 */
export function startScheduler(): void {
  if (schedulerTask) {
    logger.warn('Scheduler already running');
    return;
  }

  logger.info('⏰ Starting alarm scheduler (every 30s)');

  schedulerTask = cron.schedule('*/30 * * * * *', async () => {
    try {
      const dueAlarms = await getDueTimeAlarms();

      if (dueAlarms.length === 0) return;

      logger.info({ count: dueAlarms.length }, 'Processing due alarms');

      for (const alarm of dueAlarms) {
        try {
          // Mark as triggered
          await triggerAlarm(alarm.userId, alarm.id);

          // Send push notification
          await sendPushToUser(alarm.userId, {
            title: `⏰ Alarm: ${alarm.title}`,
            body: `It's time! Your alarm "${alarm.title}" is ringing.`,
            data: {
              type: 'time_alarm',
              alarmId: alarm.id,
            },
            actions: [
              { action: 'stop', title: 'Stop' },
              { action: 'snooze', title: 'Snooze' },
            ],
          });

          logger.info(
            { alarmId: alarm.id, userId: alarm.userId, title: alarm.title },
            'Time alarm triggered and push sent'
          );
        } catch (error) {
          logger.error(
            { alarmId: alarm.id, error: (error as Error).message },
            'Failed to process due alarm'
          );
        }
      }
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Scheduler tick error');
    }
  });
}

/**
 * Stop the alarm scheduler.
 */
export function stopScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    logger.info('Alarm scheduler stopped');
  }
}
