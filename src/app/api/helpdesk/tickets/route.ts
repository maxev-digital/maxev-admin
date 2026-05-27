import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendCustomEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';

export async function GET() {
  const tickets = await prisma.ticket.findMany({
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' },
    ],
  });
  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ticket = await prisma.ticket.create({ data: body });

  const ref = ticket.id.slice(0, 8).toUpperCase();

  // Auto: send confirmation email to submitter
  if (ticket.fromEmail) {
    sendCustomEmail({
      to: ticket.fromEmail,
      subject: `Support request received — Ref #${ref}`,
      body: `Hi ${ticket.fromName ?? 'there'},\n\nWe received your support request: "${ticket.subject}"\n\nOur team will be in touch shortly. Reference: #${ref}\n\nMax EV Digital Support\ninfo@maxevdigital.com`,
    }).catch(err => console.error('[automation] ticket confirmation email failed:', err));
  }

  // Auto: SMS the owner for urgent tickets
  if (ticket.priority === 'URGENT' && process.env.OWNER_PHONE) {
    sendSms(process.env.OWNER_PHONE, `URGENT ticket: "${ticket.subject}" from ${ticket.fromName ?? ticket.fromEmail}. Ref #${ref}`).catch(() => {});
  }

  return NextResponse.json(ticket, { status: 201 });
}
