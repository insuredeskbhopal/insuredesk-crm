// app/api/users/[id]/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserManager } from '@/lib/authMiddleware';
import { canManageRole, getVisibleUserWhere } from '@/lib/userManagementPermissions';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER']).optional(),
  organizationId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireUserManager(request);
  if ('response' in authResult) return authResult.response;
  const requester = authResult.user;

  const user = await prisma.user.findFirst({
    where: {
      id,
      ...getVisibleUserWhere(requester),
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
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (!canManageRole(requester.role, user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(user);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireUserManager(request);
  if ('response' in authResult) return authResult.response;
  const requester = authResult.user;

  const body = await request.json();
  const parseResult = updateUserSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.format() }, { status: 422 });
  }
  const data = parseResult.data;
  const targetUser = await prisma.user.findFirst({
    where: {
      id,
      ...getVisibleUserWhere(requester),
    },
  });
  if (!targetUser || targetUser.deletedAt) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (!canManageRole(requester.role, targetUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (data.role && !canManageRole(requester.role, data.role)) {
    return NextResponse.json({ error: 'You cannot assign this role' }, { status: 403 });
  }
  if (requester.role !== 'SUPER_ADMIN') {
    data.organizationId = requester.organizationId ?? undefined;
  }
  // If password is being updated, hash it first
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 12);
  }
  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
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
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireUserManager(request);
  if ('response' in authResult) return authResult.response;
  const requester = authResult.user;

  // Prevent self-deletion and ensure at least one SUPER_ADMIN remains
  const requesterId = requester.id;
  if (requesterId === id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }
  const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN', deletedAt: null } });
  const targetUser = await prisma.user.findFirst({
    where: {
      id,
      ...getVisibleUserWhere(requester),
    },
  });
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (!canManageRole(requester.role, targetUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (targetUser.role === 'SUPER_ADMIN' && superAdminCount <= 1) {
    return NextResponse.json({ error: 'At least one SUPER_ADMIN must remain' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ success: true });
}
