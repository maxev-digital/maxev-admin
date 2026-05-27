import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const task = await prisma.task.create({ data: body });
  return NextResponse.json(task, { status: 201 });
}
