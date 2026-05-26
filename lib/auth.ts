// lib/auth.ts
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'change-me-secret';
const JWT_ISSUER = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Verify a JWT and return its payload.
 * Returns null if verification fails.
 */
export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET), {
      issuer: JWT_ISSUER,
    });
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
  const iat = Math.floor(Date.now() / 1000);
  const exp = Math.floor(Date.now() / 1000) + (expiresIn === '7d' ? 7 * 24 * 60 * 60 : 60 * 60);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .setIssuer(JWT_ISSUER)
    .sign(new TextEncoder().encode(JWT_SECRET));
}
