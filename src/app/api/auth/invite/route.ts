import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendInviteEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { email, name, role = 'MEMBER' } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  const existing = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });

  const inviteToken = crypto.randomBytes(32).toString('hex');

  const newUser = await prisma.adminUser.create({
    data: {
      email:        email.toLowerCase(),
      name:         name || null,
      passwordHash: '',
      role,
      inviteToken,
    },
  });

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.maxevdigital.com';
  const inviteLink = `${appUrl}/register?token=${inviteToken}`;

  sendInviteEmail({
    toEmail:    email,
    invitedBy:  session.user.name ?? session.user.email,
    role,
    inviteLink,
  }).catch((err) => console.error('[invite] email failed:', err));

  return NextResponse.json({ ok: true, userId: newUser.id });
}
