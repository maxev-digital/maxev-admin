import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ proposalNumber: string }> }
) {
  const { proposalNumber } = await params;
  const { signToken, signerName } = await req.json();

  // proposalNumber param receives the DB id (cuid) when called from e-sign flow
  const proposal = await prisma.proposal.findUnique({ where: { id: proposalNumber } });
  if (!proposal)                        return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  if (proposal.signToken !== signToken)  return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  if (proposal.status === 'SIGNED')      return NextResponse.json({ error: 'Already signed' }, { status: 409 });

  try {
    await prisma.proposal.update({
      where: { id: proposalNumber },
      data:  { status: 'SIGNED', signedAt: new Date() },
    });

    if (proposal.leadId) {
      await prisma.lead.update({
        where: { id: proposal.leadId },
        data:  { stage: 'CONTRACT_SIGNED' },
      });

      await prisma.activityLog.create({
        data: {
          leadId:      proposal.leadId,
          type:        'proposal_signed',
          description: `Proposal ${proposal.proposalNumber} signed by ${signerName ?? 'client'} — lead advanced to Contract Signed`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[proposals/sign]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
