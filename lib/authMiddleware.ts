// lib/authMiddleware.ts
import { verifyJWT } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canOpenUserManagement } from '@/lib/userManagementPermissions';

/**
 * Middleware to ensure the request is from an authenticated SUPER_ADMIN user.
 * Returns 401 if no token, 403 if not SUPER_ADMIN, 404 if user not found.
 */
export async function requireSuperAdmin(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if ('response' in auth) return auth.response;

  if (auth.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  request.headers.set('x-user-id', auth.user.id);
  request.headers.set('x-user-role', auth.user.role);

  return null; // Continue processing
}

export async function requireUserManager(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if ('response' in auth) return auth;

  if (!canOpenUserManagement(auth.user.role)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  request.headers.set('x-user-id', auth.user.id);
  request.headers.set('x-user-role', auth.user.role);

  return { user: auth.user };
}

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return { response: NextResponse.json({ error: 'Unauthenticated' }, { status: 401 }) };
  }

  const payload = await verifyJWT(token as string);
  if (!payload) {
    return { response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) };
  }

  const userId = payload.userId as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    return { response: NextResponse.json({ error: 'User not found' }, { status: 404 }) };
  }

  return { user };
}
