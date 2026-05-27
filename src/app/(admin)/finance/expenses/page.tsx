import { prisma } from '@/lib/db';
import ExpensesTable from './ExpensesTable';

export default async function ExpenseLogPage() {
  const expenses = await prisma.expense.findMany({
    orderBy: { expenseDate: 'desc' },
  });

  const serialized = expenses.map((e) => ({
    id:          e.id,
    date:        e.expenseDate.toISOString().slice(0, 10),
    vendor:      e.vendor ?? '',
    category:    e.category,
    description: e.description,
    amount:      e.amount,
    status:      (e.status === 'APPROVED' ? 'paid' : 'pending') as 'paid' | 'pending',
  }));

  return <ExpensesTable expenses={serialized} />;
}
