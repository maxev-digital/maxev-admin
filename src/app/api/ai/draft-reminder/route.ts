import { NextRequest, NextResponse } from 'next/server';
import { draftPaymentReminder } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { clientName, invoiceNumber, amount, daysOverdue, contactName } = await req.json();

  if (!clientName || !invoiceNumber || !amount) {
    return NextResponse.json({ error: 'clientName, invoiceNumber, amount required' }, { status: 400 });
  }

  const message = await draftPaymentReminder({
    clientName,
    invoiceNumber,
    amount,
    daysOverdue: daysOverdue ?? 0,
    contactName: contactName ?? null,
  });

  return NextResponse.json({ message });
}
