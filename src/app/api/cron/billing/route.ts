import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendClientInvoice } from '@/lib/email';

function nextDate(current: Date, cycle: string): Date {
  const d = new Date(current);
  if (cycle === 'MONTHLY')   d.setMonth(d.getMonth() + 1);
  if (cycle === 'QUARTERLY') d.setMonth(d.getMonth() + 3);
  if (cycle === 'ANNUAL')    d.setFullYear(d.getFullYear() + 1);
  return d;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const dueBilling = await prisma.recurringBilling.findMany({
    where: { isActive: true, nextBillingAt: { lte: now } },
    include: { client: true },
    take: 50,
  });

  const results = [];

  for (const billing of dueBilling) {
    const { client } = billing;

    const invoiceNumber = `INV-${Date.now()}-${client.id.slice(-4).toUpperCase()}`;
    const dueDate = new Date(now.getTime() + 14 * 86400000);

    const invoice = await prisma.invoice.create({
      data: {
        clientId:      client.id,
        invoiceNumber,
        type:          'RETAINER',
        amount:        billing.amount,
        status:        billing.autoSend ? 'SENT' : 'PENDING',
        dueDate,
        notes:         billing.notes || `Auto-generated ${billing.cycle.toLowerCase()} retainer`,
        lineItems:     [{ name: `${billing.cycle} Retainer — ${client.businessName}`, type: 'monthly', price: billing.amount }],
      },
      include: { client: true },
    });

    // Advance next billing date
    await prisma.recurringBilling.update({
      where: { id: billing.id },
      data:  { nextBillingAt: nextDate(billing.nextBillingAt, billing.cycle) },
    });

    // Send email if autoSend and client has email
    if (billing.autoSend && client.email) {
      sendClientInvoice({
        toEmail:       client.email,
        toName:        client.contactName ?? client.businessName,
        businessName:  client.businessName,
        invoiceNumber: invoice.invoiceNumber,
        amount:        billing.amount,
        dueDate,
        notes:         invoice.notes,
      }).catch((err) => console.error('[billing cron] email failed:', err));
    }

    results.push({ invoiceId: invoice.id, clientId: client.id, amount: billing.amount });
  }

  return NextResponse.json({ processed: results.length, results });
}

export async function GET() {
  const due = await prisma.recurringBilling.count({
    where: { isActive: true, nextBillingAt: { lte: new Date() } },
  });
  return NextResponse.json({ due });
}
