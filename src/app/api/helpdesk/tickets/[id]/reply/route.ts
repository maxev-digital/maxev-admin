import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendHelpdeskReply } from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { replyBody, markResolved } = await req.json();

  if (!replyBody?.trim()) {
    return NextResponse.json({ error: 'replyBody is required' }, { status: 400 });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  // Send the email (fire and forget — don't block on SMTP issues)
  sendHelpdeskReply({
    toEmail:   ticket.fromEmail,
    toName:    ticket.fromName,
    subject:   ticket.subject,
    replyBody,
    ticketId:  id,
  }).catch((err) => console.error('[email] helpdesk reply failed:', err));

  // Optionally resolve the ticket
  const updated = markResolved
    ? await prisma.ticket.update({ where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date() } })
    : ticket;

  return NextResponse.json({ ok: true, ticket: updated });
}
