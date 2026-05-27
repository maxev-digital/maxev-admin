import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { resetToken: token } });

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken:       null,
      resetTokenExpiry: null,
    },
  });

  // Invalidate all existing sessions for this user
  await prisma.adminSession.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ ok: true });
}
