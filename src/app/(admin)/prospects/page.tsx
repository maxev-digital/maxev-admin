import { prisma } from '@/lib/db';
import ProspectsTable from './ProspectsTable';

export default async function ProspectsPage() {
  const prospects = await prisma.prospect.findMany({ orderBy: { createdAt: 'desc' } });
  const serialized = prospects.map((p) => ({
    id: p.id,
    businessName: p.businessName,
    industry: p.industry,
    city: p.city,
    email: p.email,
    phone: p.phone,
    presenceScore: p.presenceScore,
    outreachStatus: p.outreachStatus,
    lastContactAt: p.lastContactAt ? p.lastContactAt.toISOString() : null,
  }));
  return <ProspectsTable prospects={serialized} />;
}
