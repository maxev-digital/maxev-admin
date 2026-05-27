import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const stripeKey     = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

  const stripe  = new Stripe(stripeKey, { apiVersion: '2025-04-30.basil' });
  const payload = await req.text();
  const sig     = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(payload, sig, webhookSecret)
      : JSON.parse(payload);
  } catch (err) {
    console.error('[stripe webhook] signature verify failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const obj = event.data.object as Record<string, unknown>;

    // Try metadata lookup first (most precise)
    const meta = (obj.metadata ?? {}) as Record<string, string>;
    let invoice = meta.invoiceId
      ? await prisma.invoice.findUnique({ where: { id: meta.invoiceId } })
      : null;

    // Fall back to amount matching if no metadata
    if (!invoice) {
      const amountReceived =
        typeof obj.amount_received === 'number' ? obj.amount_received / 100 :
        typeof obj.amount_total    === 'number' ? obj.amount_total    / 100 : null;

      if (amountReceived) {
        invoice = await prisma.invoice.findFirst({
          where: { amount: amountReceived, status: { in: ['PENDING', 'SENT'] } },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    if (invoice && invoice.status !== 'PAID') {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data:  { status: 'PAID', paidAt: new Date() },
      });

      // Log activity
      prisma.activityLog.create({
        data: {
          clientId:    invoice.clientId,
          type:        'INVOICE_PAID',
          description: `Invoice ${invoice.invoiceNumber} paid via Stripe`,
          metadata:    { invoiceId: invoice.id, amount: invoice.amount },
        },
      }).catch(() => {});

      console.log(`[stripe webhook] marked invoice ${invoice.invoiceNumber} as PAID`);
    }
  }

  return NextResponse.json({ received: true });
}
