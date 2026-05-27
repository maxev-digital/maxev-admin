import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const billing = await prisma.recurringBilling.findMany({
    include: { client: { select: { id: true, businessName: true, email: true, mrr: true, packageTier: true } } },
    orderBy: { nextBillingAt: 'asc' },
  });
  return NextResponse.json(billing);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clientId, amount, cycle, nextBillingAt, autoSend, notes } = body;

  if (!clientId || !amount || !nextBillingAt) {
    return NextResponse.json({ error: 'clientId, amount, and nextBillingAt are required' }, { status: 400 });
  }

  const billing = await prisma.recurringBilling.upsert({
    where:  { clientId },
    update: { amount, cycle, nextBillingAt: new Date(nextBillingAt), autoSend: autoSend ?? false, notes: notes || null, isActive: true },
    create: { clientId, amount, cycle: cycle || 'MONTHLY', nextBillingAt: new Date(nextBillingAt), autoSend: autoSend ?? false, notes: notes || null },
    include: { client: { select: { id: true, businessName: true, email: true, mrr: true, packageTier: true } } },
  });

  return NextResponse.json(billing, { status: 201 });
}
