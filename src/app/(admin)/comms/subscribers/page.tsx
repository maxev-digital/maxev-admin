import { prisma } from '@/lib/db';
import SubscribersTable from './SubscribersTable';

export default async function SubscribersPage() {
  const raw = await prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } });

  const subscribers = raw.map((s) => ({
    id: s.id,
    email: s.email,
    name: s.name,
    businessName: s.businessName,
    industry: s.industry,
    city: s.city,
    listType: s.listType as 'PROSPECT' | 'CLIENT' | 'NEWSLETTER',
    status: s.status,
    source: s.source,
    tags: s.tags,
    createdAt: s.createdAt.toISOString(),
  }));

  return <SubscribersTable subscribers={subscribers} />;
}
