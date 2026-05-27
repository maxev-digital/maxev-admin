import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    await requireAuth();
    const { threadId } = await params;
    const tid = decodeURIComponent(threadId);

    const messages = await prisma.emailMessage.findMany({
      where: {
        OR: [
          { threadId: tid },
          { messageId: tid },
          { inReplyTo: tid },
        ],
      },
      orderBy: { receivedAt: 'asc' },
      include: {
        lead:   { select: { id: true, businessName: true, email: true } },
        client: { select: { id: true, businessName: true, email: true } },
      },
    });

    return NextResponse.json(messages);
  } catch (err) {
    console.error('[email/threads/:id GET]', err);
    return NextResponse.json([], { status: 500 });
  }
}
