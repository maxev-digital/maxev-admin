import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { user } = session;
  return NextResponse.json({
    id:          user.id,
    email:       user.email,
    name:        user.name,
    role:        user.role,
    lastLoginAt: user.lastLoginAt,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, currentPassword, newPassword } = await req.json();

  const data: Record<string, unknown> = {};

  if (name !== undefined) data.name = name || null;

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, session.user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
  }

  const updated = await prisma.adminUser.update({
    where: { id: session.user.id },
    data,
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json(updated);
}
