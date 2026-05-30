// lib/auth.ts
import { jwtVerify, SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-jwt-secret-change-me');
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production.');
}
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

/**
 * Verify a JWT and return its payload.
 * Returns null if verification fails.
 */
export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return refreshUserClaims(payload);
  } catch (err) {
    console.error('JWT verification error:', err);
    return null;
  }
}

async function refreshUserClaims(payload: Record<string, any>) {
  if (!payload?.userId) return payload;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) return null;

    return {
      ...payload,
      userId: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    };
  } catch {
    return payload;
  }
}

/**
 * Sign a new JWT for a given user payload.
 * Payload should contain at least `{ userId, role }`.
 */
export async function signJWT(payload: Record<string, any>, expiresIn = '7d') {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodedSecret);
}
