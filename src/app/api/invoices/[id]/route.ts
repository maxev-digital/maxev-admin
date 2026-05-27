import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendCustomEmail } from '@/lib/email';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, paidAt, dueDate, amount, notes, stripeLink } = body;

  const prevInvoice = await prisma.invoice.findUnique({ where: { id }, select: { status: true } });

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...(status    !== undefined && { status }),
      ...(paidAt    !== undefined && { paidAt: paidAt ? new Date(paidAt) : null }),
      ...(dueDate   !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(amount    !== undefined && { amount: parseFloat(amount) }),
      ...(notes     !== undefined && { notes }),
      ...(stripeLink !== undefined && { stripeLink }),
    },
    include: { client: true },
  });

  // Auto: send payment receipt when invoice transitions to PAID
  if (status === 'PAID' && prevInvoice?.status !== 'PAID' && invoice.client.email) {
    sendCustomEmail({
      to: invoice.client.email,
      subject: `Payment received — ${invoice.invoiceNumber}`,
      body: `Hi ${invoice.client.contactName ?? invoice.client.businessName},\n\nThank you — your payment of $${invoice.amount.toLocaleString()} for invoice ${invoice.invoiceNumber} has been received.\n\nWe appreciate your business!\n\nMax EV Digital\ninfo@maxevdigital.com`,
    }).catch(err => console.error('[automation] receipt email failed:', err));
  }

  return NextResponse.json(invoice);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
