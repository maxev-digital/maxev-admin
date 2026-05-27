import { NextRequest, NextResponse } from 'next/server';
import { draftProposalNarrative } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { businessName, industry, packageTier, lineItems, oneTimeTotal, monthlyTotal } = body;

  if (!businessName || !industry) {
    return NextResponse.json({ error: 'businessName and industry required' }, { status: 400 });
  }

  const narrative = await draftProposalNarrative({
    businessName,
    industry,
    packageTier: packageTier ?? 'STARTER',
    lineItems:   lineItems ?? [],
    oneTimeTotal: oneTimeTotal ?? 0,
    monthlyTotal: monthlyTotal ?? 0,
  });

  return NextResponse.json({ narrative });
}
