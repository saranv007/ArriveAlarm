import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/arrivealarm'),
  JWT_SECRET: z.string().min(8).default('dev-jwt-secret-change-in-production-32chars!!'),
  JWT_REFRESH_SECRET: z.string().min(8).default('dev-refresh-secret-change-in-prod-32chars!!'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().optional().default(''),
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().optional().default('mailto:admin@arrivealarm.app'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    // Fallback to defaults rather than killing serverless execution
    cachedEnv = envSchema.parse({});
    return cachedEnv;
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function isDev(): boolean {
  return getEnv().NODE_ENV === 'development';
}

export function isProd(): boolean {
  return getEnv().NODE_ENV === 'production';
}
