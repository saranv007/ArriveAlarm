import prisma from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import type { RegisterInput, LoginInput } from '../validators/auth.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  googleId: string | null;
  timezone: string;
  units: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

function toSafeUser(user: any): SafeUser {
  const { passwordHash, ...safe } = user;
  return safe;
}

export async function registerUser(input: RegisterInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  // Check if email already taken
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    const error = new Error('Email already registered') as Error & { statusCode: number; code: string };
    error.statusCode = 409;
    error.code = 'EMAIL_EXISTS';
    throw error;
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      lastLoginAt: new Date(),
      settings: {
        create: {}, // Creates UserSettings with defaults
      },
    },
  });

  const tokens = generateTokens(user);

  logger.info({ userId: user.id, email: user.email }, 'User registered');

  return { user: toSafeUser(user), tokens };
}

export async function loginUser(input: LoginInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.passwordHash) {
    const error = new Error('Invalid email or password') as Error & { statusCode: number; code: string };
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const passwordMatch = await comparePassword(input.password, user.passwordHash);
  if (!passwordMatch) {
    const error = new Error('Invalid email or password') as Error & { statusCode: number; code: string };
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = generateTokens(user);

  logger.info({ userId: user.id }, 'User logged in');

  return { user: toSafeUser(user), tokens };
}

export async function getUserById(userId: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? toSafeUser(user) : null;
}

export async function updateUser(userId: string, data: { name?: string; timezone?: string; units?: string; avatar?: string | null }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });
  return toSafeUser(user);
}

export async function deleteUser(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
  logger.info({ userId }, 'User account deleted');
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null; // Don't reveal whether email exists

  // Generate a reset token (in production, store this in DB with expiry)
  const token = crypto.randomBytes(32).toString('hex');

  // For now, log the token. In production, send via email service.
  logger.info({ userId: user.id, resetToken: token }, 'Password reset token generated (not emailed — stub)');

  return token;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  // In production, look up the token in the database, verify it hasn't expired,
  // find the associated user, and update their password.
  // For now, this is a stub that will be connected to a proper token store.
  logger.warn({ token: token.slice(0, 8) + '...' }, 'Password reset attempted (stub implementation)');

  const error = new Error('Password reset not fully implemented. Please contact support.') as Error & { statusCode: number; code: string };
  error.statusCode = 501;
  error.code = 'NOT_IMPLEMENTED';
  throw error;
}

export async function findOrCreateGoogleUser(profile: {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  // Check if user exists by Google ID
  let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });

  if (!user) {
    // Check if user exists by email (link accounts)
    user = await prisma.user.findUnique({ where: { email: profile.email } });

    if (user) {
      // Link Google ID to existing account
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
          avatar: user.avatar || profile.avatar,
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          googleId: profile.googleId,
          avatar: profile.avatar,
          lastLoginAt: new Date(),
          settings: {
            create: {},
          },
        },
      });
      logger.info({ userId: user.id, email: user.email }, 'Google user registered');
    }
  } else {
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  const tokens = generateTokens(user);
  return { user: toSafeUser(user), tokens };
}

function generateTokens(user: { id: string; email: string }): AuthTokens {
  return {
    accessToken: signAccessToken({ userId: user.id, email: user.email }),
    refreshToken: signRefreshToken({ userId: user.id, email: user.email }),
  };
}
