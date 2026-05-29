import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendOwnerNewLeadAlert } from '@/lib/email';

export async function GET() {
  const leads = await prisma.lead.findMany({
    where: { stage: { not: 'DEAD' } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  // Attach the latest signed proposal so the Convert modal can pre-fill correctly
  const leadIds = leads.map((l) => l.id);
  const proposals = await prisma.proposal.findMany({
    where: { leadId: { in: leadIds }, status: 'SIGNED' },
    select: { leadId: true, oneTimeTotal: true, monthlyTotal: true, packageTier: true },
    distinct: ['leadId'],
    orderBy: { signedAt: 'desc' },
  });
  const proposalMap = new Map(proposals.map((p) => [p.leadId, p]));

  const result = leads.map((l) => ({ ...l, signedProposal: proposalMap.get(l.id) ?? null }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lead = await prisma.lead.create({
    data: {
      businessName: body.businessName,
      contactName: body.contactName ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      website: body.website ?? null,
      industry: body.industry,
      city: body.city ?? null,
      state: body.state ?? null,
      source: body.source ?? null,
      estimatedValue: body.estimatedValue ? parseFloat(body.estimatedValue) : null,
      stage: body.stage ?? 'LEAD',
      priority: body.priority ?? 'WARM',
      notes: body.notes ?? null,
      demoDate: body.demoDate ? new Date(body.demoDate) : null,
    },
  });
  // Auto: notify owner when a new lead is added
  sendOwnerNewLeadAlert({
    businessName: lead.businessName,
    contactName:  lead.contactName,
    email:        lead.email,
    phone:        lead.phone,
    industry:     lead.industry,
    source:       lead.source,
    notes:        lead.notes,
  }).catch(err => console.error('[automation] lead alert email failed:', err));

  return NextResponse.json(lead, { status: 201 });
}
