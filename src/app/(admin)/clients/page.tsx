import { prisma } from '@/lib/db';
import ClientsTable from './ClientsTable';

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({ orderBy: { mrr: 'desc' } });
  const serialized = clients.map((c) => ({
    id: c.id,
    businessName: c.businessName,
    industry: c.industry,
    packageTier: c.packageTier,
    status: c.status,
    mrr: c.mrr,
    city: c.city,
    launchDate: c.launchDate ? c.launchDate.toISOString() : null,
  }));
  return <ClientsTable clients={serialized} />;
}
