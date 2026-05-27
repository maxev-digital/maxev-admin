import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    status:      e.status === 'APPROVED' ? 'paid' : 'pending',
  }));

  return NextResponse.json(serialized);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { description, amount, category, vendor, date, status } = await req.json();
  if (!description || !amount || !category) {
    return NextResponse.json({ error: 'description, amount, and category are required' }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      description,
      amount:      parseFloat(amount),
      category,
      vendor:      vendor || null,
      expenseDate: date ? new Date(date) : new Date(),
      status:      status === 'paid' ? 'APPROVED' : 'PENDING',
    },
  });

  return NextResponse.json({
    id:          expense.id,
    date:        expense.expenseDate.toISOString().slice(0, 10),
    vendor:      expense.vendor ?? '',
    category:    expense.category,
    description: expense.description,
    amount:      expense.amount,
    status:      expense.status === 'APPROVED' ? 'paid' : 'pending',
  }, { status: 201 });
}
