import { prisma } from '@/lib/db';
import ProposalsTableClient from './ProposalsTableClient';

export default async function ProposalsPage() {
  const proposals = await prisma.proposal.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <ProposalsTableClient proposals={proposals.map((p) => ({
      id: p.id,
      proposalNumber: p.proposalNumber,
      businessName: p.businessName,
      industry: p.industry,
      packageTier: p.packageTier,
      oneTimeTotal: p.oneTimeTotal,
      monthlyTotal: p.monthlyTotal,
      status: p.status,
      sentAt: p.sentAt,
    }))} />
  );
}
