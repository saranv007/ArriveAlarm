import pino from 'pino';

const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const isDev = process.env.NODE_ENV === 'development' && !isVercel;

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
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

