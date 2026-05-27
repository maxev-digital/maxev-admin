import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendProposalEmail } from '@/lib/email';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { leadId, packageTier, lineItems, oneTimeTotal, monthlyTotal, message } = body;

  if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 });

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const signToken     = randomUUID();
  const proposalNumber = `SS-PROP-${leadId.slice(0, 8).toUpperCase()}`;
  const appUrl        = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.maxevdigital.com';
  const signUrl       = `${appUrl}/p/${signToken}`;

  try {
    const proposal = await prisma.proposal.create({
      data: {
        leadId,
        proposalNumber,
        businessName:  lead.businessName,
        industry:      lead.industry,
        packageTier:   (packageTier ?? 'PRO') as any,
        oneTimeTotal:  parseFloat(oneTimeTotal) || 0,
        monthlyTotal:  parseFloat(monthlyTotal) || 0,
        lineItems:     lineItems ?? [],
        status:        'SENT',
        signToken,
        sentAt:        new Date(),
        expiresAt:     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes:         message || null,
      },
    });

    await prisma.lead.update({ where: { id: leadId }, data: { stage: 'PROPOSAL_SENT' } });

    await prisma.activityLog.create({
      data: {
        leadId,
        type:        'proposal_sent',
        description: `Proposal ${proposalNumber} sent — $${(parseFloat(oneTimeTotal) || 0).toLocaleString()} + $${parseFloat(monthlyTotal) || 0}/mo`,
      },
    });

    if (lead.email) {
      await sendProposalEmail({
        toEmail:        lead.email,
        toName:         lead.contactName ?? lead.businessName,
        businessName:   lead.businessName,
        proposalNumber,
        oneTimeTotal:   parseFloat(oneTimeTotal) || 0,
        monthlyTotal:   parseFloat(monthlyTotal) || 0,
        lineItems:      lineItems ?? [],
        signUrl,
        message:        message || null,
      });
    }

    return NextResponse.json({ success: true, proposalId: proposal.id, proposalNumber, signUrl }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[proposals/send]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
