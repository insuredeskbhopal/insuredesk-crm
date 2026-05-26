// app/api/users/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/authMiddleware';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(8),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER']).optional(),
  organizationId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  // Authorization
  const authResult = await requireSuperAdmin(request);
  if (authResult) return authResult;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10);
  const skip = (page - 1) * pageSize;

  const [total, users] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.findMany({
      where: { deletedAt: null },
      skip,
      take: pageSize,
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

  return NextResponse.json({ data: users, meta: { total, page, pageSize } });
}

export async function POST(request: NextRequest) {
  const authResult = await requireSuperAdmin(request);
  if (authResult) return authResult;

  const body = await request.json();
  const parseResult = createUserSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.format() }, { status: 422 });
  }
  const { email, name, password, role, organizationId } = parseResult.data;

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      password: hashed,
      role: role ?? 'AGENT',
      organizationId: organizationId ?? undefined,
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
}
