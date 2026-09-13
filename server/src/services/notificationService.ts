import webpush from 'web-push';
import prisma from '../config/database.js';
import { getEnv } from '../config/env.js';
import logger from '../config/logger.js';

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const env = getEnv();
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    vapidConfigured = true;
    return true;
  }

  logger.warn('VAPID keys not configured. Web Push notifications will not work.');
  return false;
}

export async function saveSubscription(userId: string, endpoint: string, p256dh: string, auth: string) {
  // Upsert by endpoint to avoid duplicates
  return prisma.notificationSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh, auth },
    create: { userId, endpoint, p256dh, auth },
  });
}

export async function removeSubscription(userId: string, endpoint: string) {
  const sub = await prisma.notificationSubscription.findFirst({
    where: { userId, endpoint },
  });

  if (sub) {
    await prisma.notificationSubscription.delete({ where: { id: sub.id } });
  }
}

export async function removeAllSubscriptions(userId: string) {
  await prisma.notificationSubscription.deleteMany({ where: { userId } });
}

export async function sendPushToUser(userId: string, payload: {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string }>;
}) {
  if (!ensureVapidConfigured()) return;

  const subscriptions = await prisma.notificationSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    logger.debug({ userId }, 'No push subscriptions for user');
    return;
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    data: payload.data || {},
    actions: payload.actions || [],
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notificationPayload
        );
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          // Subscription expired — remove it
          logger.info({ subscriptionId: sub.id }, 'Removing expired push subscription');
          await prisma.notificationSubscription.delete({ where: { id: sub.id } });
        } else {
          logger.error({ error: error.message, subscriptionId: sub.id }, 'Push notification failed');
        }
      }
    })
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  logger.debug({ userId, total: subscriptions.length, succeeded }, 'Push notifications sent');
}

export async function sendTestNotification(userId: string) {
  await sendPushToUser(userId, {
    title: '🔔 ArriveAlarm Test',
    body: 'Push notifications are working! You will receive alerts when your alarms trigger.',
    data: { type: 'test' },
  });
}

export function getVapidPublicKey(): string {
  return getEnv().VAPID_PUBLIC_KEY;
}
