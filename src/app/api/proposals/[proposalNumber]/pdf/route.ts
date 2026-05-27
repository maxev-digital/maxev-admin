import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;

type LineItem = { name: string; type: string; price: number };

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
  { params }: { params: Promise<{ proposalNumber: string }> }
) {
  const { proposalNumber } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { proposalNumber },
    include: { client: true },
  });

  if (!proposal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const dark      = rgb(0.07, 0.09, 0.13);
  const blue      = rgb(0.23, 0.49, 0.85);
  const white     = rgb(1, 1, 1);
  const lightGray = rgb(0.50, 0.53, 0.58);
  const lineGray  = rgb(0.86, 0.88, 0.91);
  const green     = rgb(0.06, 0.73, 0.51);
  const rowAlt    = rgb(0.97, 0.97, 0.98);
  const rowHead   = rgb(0.92, 0.93, 0.95);

  const ml = 55;
  const mr = 55;
  const cw = width - ml - mr;

  let y = height;

  // ── HEADER ────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 88, width, height: 88, color: dark });

  page.drawText('MAX EV DIGITAL', {
    x: ml, y: height - 36, size: 22, font: bold, color: white,
  });
  page.drawText('Digital Marketing & Web Solutions', {
    x: ml, y: height - 55, size: 10, font: regular, color: rgb(0.65, 0.70, 0.78),
  });

  page.drawText('PROPOSAL', {
    x: width - mr - 110, y: height - 33, size: 9, font: bold, color: blue,
  });
  page.drawText(proposalNumber, {
    x: width - mr - 110, y: height - 50, size: 16, font: bold, color: white,
  });

  y = height - 88 - 26;

  // ── META ROW ─────────────────────────────────────────────────────────────
  const sentLabel = fmtDate(proposal.sentAt) ?? fmtDate(new Date()) ?? '';
  page.drawText(`Date: ${sentLabel}`, {
    x: ml, y, size: 10, font: regular, color: lightGray,
  });

  const statusColors: Record<string, ReturnType<typeof rgb>> = {
    SIGNED: green, SENT: blue, VIEWED: blue,
    DRAFT: lightGray, DECLINED: rgb(0.85, 0.22, 0.22), EXPIRED: rgb(0.85, 0.55, 0.10),
  };
  const statusColor = statusColors[proposal.status] ?? lightGray;
  page.drawText(`Status: ${proposal.status}`, {
    x: ml + 190, y, size: 10, font: bold, color: statusColor,
  });

  y -= 26;

  // ── PREPARED FOR ─────────────────────────────────────────────────────────
  page.drawText('PREPARED FOR', { x: ml, y, size: 8, font: bold, color: blue });
  y -= 16;
  page.drawText(proposal.businessName, { x: ml, y, size: 18, font: bold, color: dark });
  y -= 19;

  const subLine = [proposal.industry, `${proposal.packageTier} Package`].join('  •  ');
  page.drawText(subLine, { x: ml, y, size: 10, font: regular, color: lightGray });
  y -= 26;

  page.drawLine({ start: { x: ml, y }, end: { x: width - mr, y }, thickness: 0.75, color: lineGray });
  y -= 24;

  // ── SCOPE OF WORK ─────────────────────────────────────────────────────────
  page.drawText('SCOPE OF WORK', { x: ml, y, size: 10, font: bold, color: dark });
  y -= 18;

  const c1 = ml;
  const c2 = ml + 316;
  const c3 = ml + 400;

  // Table header
  page.drawRectangle({ x: ml, y: y - 5, width: cw, height: 22, color: rowHead });
  page.drawText('Service / Deliverable', { x: c1 + 8, y: y + 3, size: 9, font: bold, color: dark });
  page.drawText('Type', { x: c2 + 4, y: y + 3, size: 9, font: bold, color: dark });
  page.drawText('Amount', { x: c3 + 4, y: y + 3, size: 9, font: bold, color: dark });
  y -= 24;

  // Line items
  const lineItems = parseLineItems(proposal.lineItems);
  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    if (i % 2 === 0) {
      page.drawRectangle({ x: ml, y: y - 5, width: cw, height: 20, color: rowAlt });
    }
    const name = item.name.length > 55 ? item.name.slice(0, 55) + '...' : item.name;
    page.drawText(name, { x: c1 + 8, y: y + 2, size: 9, font: regular, color: dark });
    page.drawText(item.type === 'monthly' ? 'Monthly' : 'One-Time', {
      x: c2 + 4, y: y + 2, size: 9, font: regular, color: lightGray,
    });
    const priceStr = item.type === 'monthly'
      ? `${fmt(item.price)}/mo`
      : fmt(item.price);
    const pw = regular.widthOfTextAtSize(priceStr, 9);
    page.drawText(priceStr, { x: c3 + 88 - pw, y: y + 2, size: 9, font: regular, color: dark });
    y -= 20;
  }

  y -= 18;
  page.drawLine({ start: { x: ml, y }, end: { x: width - mr, y }, thickness: 0.75, color: lineGray });
  y -= 24;

  // ── PRICING SUMMARY ───────────────────────────────────────────────────────
  page.drawText('PRICING SUMMARY', { x: ml, y, size: 10, font: bold, color: dark });
  y -= 20;

  const priceLeft = width - mr - 220;
  const priceRight = width - mr;

  const row = (label: string, value: string, isBold = false, color = dark) => {
    page.drawText(label, { x: priceLeft, y, size: 10, font: regular, color: lightGray });
    const vw = (isBold ? bold : regular).widthOfTextAtSize(value, 10);
    page.drawText(value, { x: priceRight - vw, y, size: 10, font: isBold ? bold : regular, color });
    y -= 19;
  };

  row('One-Time Setup Fee:', fmt(proposal.oneTimeTotal));
  row('Monthly Retainer:', `${fmt(proposal.monthlyTotal)}/mo`);

  y -= 4;
  page.drawLine({ start: { x: priceLeft, y }, end: { x: priceRight, y }, thickness: 0.75, color: lineGray });
  y -= 16;

  const annual = proposal.oneTimeTotal + proposal.monthlyTotal * 12;
  row('Total 12-Month Value:', fmt(annual), true, green);

  y -= 20;

  // ── EXPIRY ────────────────────────────────────────────────────────────────
  if (proposal.expiresAt && proposal.status === 'SENT') {
    const expStr = `This proposal expires on ${fmtDate(proposal.expiresAt)}.`;
    page.drawText(expStr, { x: ml, y, size: 9, font: regular, color: rgb(0.85, 0.55, 0.10) });
    y -= 20;
  }

  // ── NOTES ─────────────────────────────────────────────────────────────────
  if (proposal.notes) {
    page.drawLine({ start: { x: ml, y }, end: { x: width - mr, y }, thickness: 0.75, color: lineGray });
    y -= 20;
    page.drawText('NOTES', { x: ml, y, size: 10, font: bold, color: dark });
    y -= 16;
    const words = proposal.notes.split(' ');
    let line = '';
    for (const word of words) {
      if ((line + word).length > 82) {
        page.drawText(line.trim(), { x: ml, y, size: 9, font: regular, color: lightGray });
        y -= 14;
        line = word + ' ';
      } else {
        line += word + ' ';
      }
    }
    if (line.trim()) {
      page.drawText(line.trim(), { x: ml, y, size: 9, font: regular, color: lightGray });
    }
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: 0, y: 48 }, end: { x: width, y: 48 }, thickness: 0.75, color: lineGray });
  page.drawText('Confidential  |  Max EV Digital  |  maxevdigital.com', {
    x: ml, y: 32, size: 8, font: regular, color: lightGray,
  });
  if (proposal.expiresAt) {
    const expLabel = `Proposal expires ${fmtDate(proposal.expiresAt)}`;
    const ew = regular.widthOfTextAtSize(expLabel, 8);
    page.drawText(expLabel, { x: width - mr - ew, y: 32, size: 8, font: regular, color: lightGray });
  }

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${proposalNumber}.pdf"`,
    },
  });
}
