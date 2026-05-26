// lib/authMiddleware.ts
import { verifyJWT } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Middleware to ensure the request is from an authenticated SUPER_ADMIN user.
 * Returns 401 if no token, 403 if not SUPER_ADMIN, 404 if user not found.
 */
export async function requireSuperAdmin(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const payload = await verifyJWT(token as string);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const userId = payload.userId as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Attach user info to request headers for downstream handlers
  request.headers.set('x-user-id', userId);
  request.headers.set('x-user-role', user.role);

  return null; // Continue processing
}
