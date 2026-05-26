// lib/auth.ts
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'bimaheadquarter_jwt_super_secret_fallback_key_32_chars';
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
