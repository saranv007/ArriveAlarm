import 'dotenv/config';
import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import logger from './config/logger.js';
import { startScheduler, stopScheduler } from './services/schedulerService.js';
import prisma from './config/database.js';

async function main() {
  const env = getEnv();
  const app = createApp();

  // Verify database connectivity
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (error) {
    logger.warn('⚠️ Could not connect to PostgreSQL database. API will run in offline fallback mode.');
  }

  // Start alarm scheduler
  startScheduler();

  // Start HTTP server
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 ArriveAlarm API running on http://localhost:${env.PORT}`);
    logger.info(`📋 Environment: ${env.NODE_ENV}`);
    logger.info(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');

    stopScheduler();

    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server shut down gracefully');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

main().catch((error) => {
  logger.error({ error }, 'Fatal startup error');
  process.exit(1);
});
