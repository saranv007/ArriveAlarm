import pino from 'pino';
import { isDev } from './env.js';

export const logger = pino({
  level: isDev() ? 'debug' : 'info',
  transport: isDev()
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export default logger;
