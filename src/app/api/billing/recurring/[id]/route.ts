import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = await prisma.recurringBilling.update({
    where: { id },
    data: body,
    include: { client: { select: { id: true, businessName: true, email: true, mrr: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.recurringBilling.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
