import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const sp        = new URL(req.url).searchParams;
    const folder    = sp.get('folder')    || 'INBOX';
    const search    = sp.get('search')    || '';
    const leadId    = sp.get('leadId')    || '';
    const clientId  = sp.get('clientId') || '';
    const accountId = sp.get('accountId') || '';
    const limit     = Math.min(parseInt(sp.get('limit') || '60'), 200);

    const where: Record<string, unknown> = {};

    if (accountId) where.accountId = accountId;

    if (leadId)        where.leadId   = leadId;
    else if (clientId) where.clientId = clientId;
    else if (folder === 'STARRED') where.isStarred = true;
    else if (folder === 'SENT')    where.isSent    = true;
    else                           where.isSent    = false;   // INBOX default

    if (search) {
      where.OR = [
        { subject:   { contains: search, mode: 'insensitive' } },
        { fromEmail: { contains: search, mode: 'insensitive' } },
        { fromName:  { contains: search, mode: 'insensitive' } },
        { snippet:   { contains: search, mode: 'insensitive' } },
      ];
    }

    const [messages, unread] = await Promise.all([
      prisma.emailMessage.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take:    limit,
        select: {
          id: true, subject: true, fromEmail: true, fromName: true,
          snippet: true, isRead: true, isStarred: true, isSent: true,
          folder: true, receivedAt: true, hasAttachment: true,
          threadId: true, leadId: true, clientId: true,
          lead:   { select: { businessName: true } },
          client: { select: { businessName: true } },
        },
      }),
      prisma.emailMessage.count({ where: { isSent: false, isRead: false } }),
    ]);

    return NextResponse.json({ messages, unread });
  } catch (err) {
    console.error('[email/messages GET]', err);
    return NextResponse.json({ messages: [], unread: 0 });
  }
}
