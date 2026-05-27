import { prisma } from '@/lib/db';
import InvoicesTable from './InvoicesTable';

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const initialFilter = params.status ?? 'All';
  const [invoices, clients] = await Promise.all([
    prisma.invoice.findMany({
      include: { client: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, businessName: true, email: true, contactName: true },
      orderBy: { businessName: 'asc' },
    }),
  ]);

  const serialized = invoices.map((i) => ({
    id:            i.id,
    invoiceNumber: i.invoiceNumber,
    clientId:      i.clientId,
    clientName:    i.client.businessName,
    clientEmail:   i.client.email,
    type:          i.type,
    amount:        i.amount,
    status:        i.status,
    dueDate:       i.dueDate  ? i.dueDate.toISOString()  : null,
    paidAt:        i.paidAt   ? i.paidAt.toISOString()   : null,
    stripeLink:    i.stripeLink ?? null,
    notes:         i.notes    ?? null,
  }));

  return <InvoicesTable invoices={serialized} clients={clients} initialFilter={initialFilter} />;
}
