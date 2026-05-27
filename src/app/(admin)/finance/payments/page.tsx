import { prisma } from '@/lib/db';
import PaymentsTable from './PaymentsTable';

export default async function PaymentsPage() {
  const invoices = await prisma.invoice.findMany({
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  });

  const payments = invoices
    .filter((i) => i.status === 'PAID' || i.status === 'PENDING' || i.status === 'SENT' || i.status === 'OVERDUE')
    .map((i) => ({
      id:            i.invoiceNumber,
      client:        i.client.businessName,
      type:          i.type as string,
      amount:        i.amount,
      status:        i.status === 'PAID' ? 'completed' : i.status === 'OVERDUE' ? 'failed' : 'pending',
      date:          (i.paidAt ?? i.createdAt).toISOString().slice(0, 10),
      invoiceNumber: i.invoiceNumber,
    }));

  // Active retainer clients = RETAINER invoices that are PAID (most recent per client)
  const retainersByClient = new Map<string, { client: string; amount: number; status: string }>();
  invoices
    .filter((i) => i.type === 'RETAINER')
    .forEach((i) => {
      if (!retainersByClient.has(i.clientId)) {
        retainersByClient.set(i.clientId, {
          client: i.client.businessName,
          amount: i.amount,
          status: i.status === 'PAID' ? 'Active' : 'Past Due',
        });
      }
    });

  const subscriptions = Array.from(retainersByClient.values());

  return <PaymentsTable payments={payments} subscriptions={subscriptions} />;
}
