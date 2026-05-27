// lib/auth.ts
import { jwtVerify, SignJWT } from 'jose';

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
    return payload;
  } catch (err) {
    console.error('JWT verification error:', err);
    return null;
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
