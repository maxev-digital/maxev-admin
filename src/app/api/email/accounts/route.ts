import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await requireAuth();
    const accounts = await prisma.emailAccount.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, label: true, email: true, imapHost: true, imapPort: true,
        smtpHost: true, smtpPort: true, fromName: true,
        isActive: true, lastSyncAt: true, createdAt: true,
      },
    });
    return NextResponse.json(accounts);
  } catch (err) {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { label, email, imapHost, imapPort, imapPass, smtpHost, smtpPort, smtpPass, fromName } = body;

    if (!email?.trim()) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const account = await prisma.emailAccount.create({
      data: {
        label:    label    || email,
        email:    email.toLowerCase().trim(),
        imapHost: imapHost || 'imap.hostinger.com',
        imapPort: imapPort || 993,
        imapPass: imapPass || '',
        smtpHost: smtpHost || 'smtp.hostinger.com',
        smtpPort: smtpPort || 465,
        smtpPass: smtpPass || '',
        fromName: fromName || 'Max EV Digital',
      },
    });

    return NextResponse.json(account);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
