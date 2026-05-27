import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendClientInvoice } from '@/lib/email';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2025-04-30.basil' });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true },
  });

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price_data: {
          currency:     'usd',
          unit_amount:  Math.round(invoice.amount * 100),
          product_data: {
            name:        `Invoice ${invoice.invoiceNumber}`,
            description: `${invoice.client.businessName} — ${invoice.type}`,
            metadata:    { invoiceId: invoice.id },
          },
        },
        quantity: 1,
      },
    ],
    metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    after_completion: {
      type:     'redirect',
      redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.maxevdigital.com'}/invoices?paid=1` },
    },
  });

  const updated = await prisma.invoice.update({
    where: { id },
    data:  { stripeLink: paymentLink.url, status: 'SENT' },
    include: { client: true },
  });

  const body = await req.json().catch(() => ({}));
  if (body.sendEmail && invoice.client.email) {
    sendClientInvoice({
      toEmail:       invoice.client.email,
      toName:        invoice.client.contactName ?? invoice.client.businessName,
      businessName:  invoice.client.businessName,
      invoiceNumber: invoice.invoiceNumber,
      amount:        invoice.amount,
      dueDate:       invoice.dueDate,
      stripeLink:    paymentLink.url,
      notes:         invoice.notes,
    }).catch((err) => console.error('[email] invoice send failed:', err));
  }

  return NextResponse.json({ stripeLink: paymentLink.url, invoice: updated });
}
