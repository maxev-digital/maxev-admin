import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

type LineItem = { name: string; type?: string; price: number; quantity?: number };

function parseLineItems(raw: unknown): LineItem[] {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true },
  });

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const pdfDoc = await PDFDocument.create();
  const page   = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const dark      = rgb(0.07, 0.09, 0.13);
  const blue      = rgb(0.23, 0.49, 0.85);
  const white     = rgb(1, 1, 1);
  const lightGray = rgb(0.50, 0.53, 0.58);
  const lineGray  = rgb(0.86, 0.88, 0.91);
  const green     = rgb(0.06, 0.73, 0.51);
  const rowAlt    = rgb(0.97, 0.97, 0.98);
  const rowHead   = rgb(0.92, 0.93, 0.95);
  const red       = rgb(0.85, 0.22, 0.22);

  const statusColor: Record<string, ReturnType<typeof rgb>> = {
    PAID:      green,
    OVERDUE:   red,
    SENT:      blue,
    PENDING:   lightGray,
    CANCELLED: lightGray,
  };

  const ml = 55;
  const mr = 55;
  const cw = width - ml - mr;

  let y = height;

  // ── HEADER ────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 88, width, height: 88, color: dark });
  page.drawText('MAX EV DIGITAL', { x: ml, y: height - 36, size: 22, font: bold, color: white });
  page.drawText('Digital Marketing & Web Solutions', { x: ml, y: height - 55, size: 10, font: regular, color: rgb(0.65, 0.70, 0.78) });
  page.drawText('INVOICE', { x: width - mr - 90, y: height - 33, size: 9, font: bold, color: blue });
  page.drawText(invoice.invoiceNumber, { x: width - mr - 110, y: height - 50, size: 14, font: bold, color: white });

  y = height - 88 - 26;

  // ── STATUS + DATE ROW ─────────────────────────────────────────────────────
  page.drawText(`Date: ${fmtDate(invoice.createdAt)}`, { x: ml, y, size: 10, font: regular, color: lightGray });
  const sCl = statusColor[invoice.status] ?? lightGray;
  page.drawText(`Status: ${invoice.status}`, { x: ml + 200, y, size: 10, font: bold, color: sCl });
  if (invoice.dueDate) {
    page.drawText(`Due: ${fmtDate(invoice.dueDate)}`, { x: ml + 340, y, size: 10, font: regular, color: lightGray });
  }
  y -= 26;

  // ── BILL TO ───────────────────────────────────────────────────────────────
  page.drawText('BILL TO', { x: ml, y, size: 8, font: bold, color: blue });
  y -= 16;
  page.drawText(invoice.client.businessName, { x: ml, y, size: 16, font: bold, color: dark });
  y -= 18;
  if (invoice.client.contactName) {
    page.drawText(invoice.client.contactName, { x: ml, y, size: 10, font: regular, color: lightGray });
    y -= 15;
  }
  if (invoice.client.email) {
    page.drawText(invoice.client.email, { x: ml, y, size: 10, font: regular, color: blue });
    y -= 15;
  }
  y -= 12;
  page.drawLine({ start: { x: ml, y }, end: { x: width - mr, y }, thickness: 0.75, color: lineGray });
  y -= 24;

  // ── LINE ITEMS ────────────────────────────────────────────────────────────
  const lineItems = parseLineItems(invoice.lineItems);

  if (lineItems.length > 0) {
    page.drawText('SERVICES', { x: ml, y, size: 10, font: bold, color: dark });
    y -= 18;

    const c1 = ml;
    const c2 = ml + 340;
    const c3 = ml + 430;

    // Table header
    page.drawRectangle({ x: ml, y: y - 5, width: cw, height: 22, color: rowHead });
    page.drawText('Description', { x: c1 + 8, y: y + 3, size: 9, font: bold, color: dark });
    page.drawText('Type', { x: c2 + 4, y: y + 3, size: 9, font: bold, color: dark });
    page.drawText('Amount', { x: c3 + 4, y: y + 3, size: 9, font: bold, color: dark });
    y -= 24;

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (i % 2 === 0) page.drawRectangle({ x: ml, y: y - 5, width: cw, height: 20, color: rowAlt });
      const name = item.name.length > 60 ? item.name.slice(0, 60) + '...' : item.name;
      page.drawText(name, { x: c1 + 8, y: y + 2, size: 9, font: regular, color: dark });
      page.drawText(item.type ?? '—', { x: c2 + 4, y: y + 2, size: 9, font: regular, color: lightGray });
      const priceStr = fmt(item.price);
      const pw = regular.widthOfTextAtSize(priceStr, 9);
      page.drawText(priceStr, { x: c3 + 80 - pw, y: y + 2, size: 9, font: regular, color: dark });
      y -= 20;
    }
    y -= 10;
    page.drawLine({ start: { x: ml, y }, end: { x: width - mr, y }, thickness: 0.75, color: lineGray });
    y -= 24;
  }

  // ── TOTAL ─────────────────────────────────────────────────────────────────
  const priceLeft  = width - mr - 200;
  const priceRight = width - mr;

  page.drawText('Invoice Type:', { x: priceLeft, y, size: 10, font: regular, color: lightGray });
  const typeW = regular.widthOfTextAtSize(invoice.type, 10);
  page.drawText(invoice.type, { x: priceRight - typeW, y, size: 10, font: regular, color: dark });
  y -= 19;

  page.drawLine({ start: { x: priceLeft, y }, end: { x: priceRight, y }, thickness: 0.75, color: lineGray });
  y -= 16;

  page.drawText('AMOUNT DUE:', { x: priceLeft, y, size: 11, font: bold, color: dark });
  const totalStr = fmt(invoice.amount);
  const totalW = bold.widthOfTextAtSize(totalStr, 14);
  page.drawText(totalStr, { x: priceRight - totalW, y: y - 2, size: 14, font: bold, color: sCl });
  y -= 30;

  // ── PAYMENT LINK ──────────────────────────────────────────────────────────
  if (invoice.stripeLink) {
    page.drawText('Pay online: ' + invoice.stripeLink, { x: ml, y, size: 9, font: regular, color: blue });
    y -= 20;
  }

  // ── PAID AT ───────────────────────────────────────────────────────────────
  if (invoice.paidAt) {
    page.drawText(`Paid on ${fmtDate(invoice.paidAt)}`, { x: ml, y, size: 9, font: regular, color: green });
    y -= 20;
  }

  // ── NOTES ─────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    y -= 6;
    page.drawLine({ start: { x: ml, y }, end: { x: width - mr, y }, thickness: 0.75, color: lineGray });
    y -= 18;
    page.drawText('NOTES', { x: ml, y, size: 10, font: bold, color: dark });
    y -= 15;
    const words = invoice.notes.split(' ');
    let line = '';
    for (const word of words) {
      if ((line + word).length > 88) {
        page.drawText(line.trim(), { x: ml, y, size: 9, font: regular, color: lightGray });
        y -= 13;
        line = word + ' ';
      } else {
        line += word + ' ';
      }
    }
    if (line.trim()) page.drawText(line.trim(), { x: ml, y, size: 9, font: regular, color: lightGray });
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: 0, y: 48 }, end: { x: width, y: 48 }, thickness: 0.75, color: lineGray });
  page.drawText('Thank you for your business  |  Max EV Digital  |  info@maxevdigital.com', {
    x: ml, y: 32, size: 8, font: regular, color: lightGray,
  });

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
