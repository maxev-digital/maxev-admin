import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  const expense = await prisma.expense.update({
    where: { id },
    data: { status: status === 'paid' ? 'APPROVED' : 'PENDING' },
  });

  return NextResponse.json({
    id:          expense.id,
    date:        expense.expenseDate.toISOString().slice(0, 10),
    vendor:      expense.vendor ?? '',
    category:    expense.category,
    description: expense.description,
    amount:      expense.amount,
    status:      expense.status === 'APPROVED' ? 'paid' : 'pending',
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
