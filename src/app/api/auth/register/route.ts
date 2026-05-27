import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { token, name, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { inviteToken: token } });

  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired invitation link' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      passwordHash,
      name:        name || user.name,
      inviteToken: null,
    },
  });

  return NextResponse.json({ ok: true });
}
