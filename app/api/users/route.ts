// app/api/users/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUserManager } from '@/lib/auth/middleware';
import { canManageRole, getAssignableRoles, getVisibleUserWhere } from '@/lib/auth/user-permissions';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(8),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER']).optional(),
  organizationId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  // Authorization
  const authResult = await requireUserManager(request);
  if ('response' in authResult) return authResult.response;
  const requester = authResult.user;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10);
  const skip = (page - 1) * pageSize;
  const where = getVisibleUserWhere(requester);

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    data: users,
    meta: { total, page, pageSize, assignableRoles: getAssignableRoles(requester.role), currentRole: requester.role }
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireUserManager(request);
  if ('response' in authResult) return authResult.response;
  const requester = authResult.user;

  const body = await request.json();
  const parseResult = createUserSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.format() }, { status: 422 });
  }
  const { email, name, password, role, organizationId } = parseResult.data;
  const requestedRole = role ?? 'AGENT';

  if (!canManageRole(requester.role, requestedRole)) {
    return NextResponse.json({ error: 'You cannot create users with this role' }, { status: 403 });
  }

  try {
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashed,
        role: requestedRole,
        organizationId: requester.role === 'SUPER_ADMIN' ? organizationId ?? requester.organizationId ?? undefined : requester.organizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
