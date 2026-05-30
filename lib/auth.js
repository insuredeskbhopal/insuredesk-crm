/* global TextEncoder */
import bcryptjs from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

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
    return refreshUserClaims(payload);
  } catch {
    return null;
  }
}

async function refreshUserClaims(payload) {
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
        deletedAt: true
      }
    });

    if (!user || user.deletedAt) return null;

    return {
      ...payload,
      userId: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId
    };
  } catch {
    return payload;
  }
}
