import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const expenses = await prisma.expense.findMany({
    orderBy: { expenseDate: 'desc' },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const expense = await prisma.expense.create({ data: body });
  return NextResponse.json(expense, { status: 201 });
}
