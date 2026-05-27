import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (body.status === 'DONE' && !body.completedAt) {
    body.completedAt = new Date();
  }

  const task = await prisma.task.update({ where: { id }, data: body });
  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
