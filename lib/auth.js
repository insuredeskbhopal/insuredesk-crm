/* global TextEncoder */
import bcryptjs from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-only-jwt-secret-change-me");
if (!SECRET_KEY) {
  throw new Error("JWT_SECRET is required in production.");
}
const encodedSecret = new TextEncoder().encode(SECRET_KEY);

/**
 * Hash a plain text password.
 */
export async function hashPassword(password) {
  return bcryptjs.hash(password, 10);
}

/**
 * Compare a plain text password with a hash.
 */
export async function comparePassword(password, hash) {
  return bcryptjs.compare(password, hash);
}

/**
 * Sign a payload into a JWT token.
 */
export async function signJWT(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(encodedSecret);
}

/**
 * Verify and decode a JWT token. Returns payload or null if invalid.
 */
export async function verifyJWT(token) {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return payload;
  } catch {
    return null;
  }
}
