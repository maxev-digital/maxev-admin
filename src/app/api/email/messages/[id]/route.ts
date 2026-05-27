import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;

    const msg = await prisma.emailMessage.findUnique({
      where: { id },
      include: {
        lead:   { select: { id: true, businessName: true, contactName: true, email: true, stage: true } },
        client: { select: { id: true, businessName: true, contactName: true, email: true, status: true } },
      },
    });

    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!msg.isRead) {
      await prisma.emailMessage.update({ where: { id }, data: { isRead: true } });
    }

    return NextResponse.json({ ...msg, isRead: true });
  } catch (err) {
    console.error('[email/messages/:id GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body   = await req.json();

    const data: Record<string, unknown> = {};
    if (body.isRead     !== undefined) data.isRead     = body.isRead;
    if (body.isStarred  !== undefined) data.isStarred  = body.isStarred;
    if (body.leadId     !== undefined) data.leadId     = body.leadId;
    if (body.clientId   !== undefined) data.clientId   = body.clientId;

    const updated = await prisma.emailMessage.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[email/messages/:id PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
