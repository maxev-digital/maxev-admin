import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { clientId, proposalId, type, amount, lineItems, dueDate, notes, invoiceNumber } = body;

  if (!clientId || !type || !amount) {
    return NextResponse.json({ error: 'clientId, type, and amount are required' }, { status: 400 });
  }

  let number = invoiceNumber;
  if (!number) {
    const count = await prisma.invoice.count();
    number = `INV-${String(count + 1).padStart(4, '0')}`;
  }

  const invoice = await prisma.invoice.create({
    data: {
      clientId,
      proposalId: proposalId ?? null,
      invoiceNumber: number,
      type,
      amount: parseFloat(amount),
      lineItems: lineItems ?? [],
      dueDate:  dueDate ? new Date(dueDate) : null,
      notes:    notes ?? null,
    },
    include: { client: true },
  });

  return NextResponse.json(invoice, { status: 201 });
}
