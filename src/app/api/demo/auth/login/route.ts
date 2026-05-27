import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const prospect = await prisma.prospectAccount.findUnique({ where: { email } });
  if (!prospect || !prospect.isActive || !(await bcrypt.compare(password, prospect.passwordHash))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const ua = req.headers.get('user-agent') || null;

  await prisma.prospectSession.create({
    data: { prospectId: prospect.id, token, ipAddress: ip, userAgent: ua, expiresAt },
  });

  await prisma.prospectAccount.update({
    where: { id: prospect.id },
    data: { loginCount: { increment: 1 }, lastLoginAt: new Date() },
  });

  const cookieStore = await cookies();
  cookieStore.set('prospect_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return NextResponse.json({ ok: true, name: prospect.name });
}
