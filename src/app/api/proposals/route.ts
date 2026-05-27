import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const proposals = await prisma.proposal.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(proposals);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await prisma.proposal.count();
  const proposalNumber = `PROP-${String(count + 1).padStart(4, '0')}`;
  const proposal = await prisma.proposal.create({
    data: {
      proposalNumber,
      businessName: body.businessName,
      industry: body.industry,
      packageTier: body.packageTier ?? 'STARTER',
      oneTimeTotal: body.oneTimeTotal ?? 0,
      monthlyTotal: body.monthlyTotal ?? 0,
      lineItems: body.lineItems ?? [],
      status: 'DRAFT',
      clientId: body.clientId ?? null,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(proposal, { status: 201 });
}
