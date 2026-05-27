import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPasswordReset } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });

  // Always return success — don't reveal whether email exists
  if (!user) return NextResponse.json({ ok: true });

  const token   = crypto.randomBytes(32).toString('hex');
  const expiry  = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.adminUser.update({
    where: { id: user.id },
    data:  { resetToken: token, resetTokenExpiry: expiry },
  });

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.maxevdigital.com';
  const resetLink = `${appUrl}/reset-password?token=${token}`;

  sendPasswordReset({
    toEmail:   user.email,
    toName:    user.name ?? user.email,
    resetLink,
  }).catch((err) => console.error('[forgot-password] email failed:', err));

  return NextResponse.json({ ok: true });
}
