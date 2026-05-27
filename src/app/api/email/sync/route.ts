import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { syncEmails, hasAnyAccount } from '@/lib/imap-sync';

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const sp = new URL(req.url).searchParams;
    const accountId = sp.get('accountId') || undefined;

    const configured = !!(process.env.IMAP_HOST && process.env.IMAP_USER) || await hasAnyAccount();
    if (!configured) {
      return NextResponse.json({ ok: false, demo: true, synced: 0, message: 'No email accounts configured yet' });
    }

    const result = await syncEmails(accountId);
    return NextResponse.json({ ok: !result.error, ...result });
  } catch (err) {
    console.error('[email/sync]', err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Sync failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireAuth();
    const accounts = await prisma.emailAccount.findMany({
      where: { isActive: true },
      select: { id: true, email: true, label: true, lastSyncAt: true, fromName: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({
      configured: !!(process.env.IMAP_HOST && process.env.IMAP_USER) || accounts.length > 0,
      accounts,
    });
  } catch {
    return NextResponse.json({ configured: false, accounts: [] });
  }
}
