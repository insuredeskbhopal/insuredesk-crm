// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/authMiddleware';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER']).optional(),
  organizationId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireSuperAdmin(request);
  if (authResult) return authResult;

  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
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
  return NextResponse.json(user);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireSuperAdmin(request);
  if (authResult) return authResult;

  const body = await request.json();
  const parseResult = updateUserSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.format() }, { status: 422 });
  }
  const data = parseResult.data;
  // If password is being updated, hash it first
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 12);
  }
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
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireSuperAdmin(request);
  if (authResult) return authResult;

  // Prevent self-deletion and ensure at least one SUPER_ADMIN remains
  const requesterId = request.headers.get('x-user-id');
  if (requesterId === id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }
  const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN', deletedAt: null } });
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
