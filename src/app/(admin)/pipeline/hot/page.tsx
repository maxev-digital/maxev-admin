import { prisma } from '@/lib/db';
import HotLeadsTable from './HotLeadsTable';

export default async function HotLeadsPage() {
  const leads = await prisma.lead.findMany({
    where: { priority: 'HOT', stage: { not: 'DEAD' } },
    orderBy: { stage: 'asc' },
  });

  const serialized = leads.map((l) => ({
    id: l.id,
    businessName: l.businessName,
    contactName: l.contactName,
    industry: l.industry,
    stage: l.stage,
    estimatedValue: l.estimatedValue,
    city: l.city,
    source: l.source,
    notes: l.notes,
  }));

  return <HotLeadsTable initialLeads={serialized} />;
}
