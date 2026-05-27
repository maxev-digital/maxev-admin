import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const body = await req.json();

  const prospect = await prisma.prospectAccount.update({
    where: { id },
    data: {
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
      ...(body.name ? { name: body.name } : {}),
      ...(body.company !== undefined ? { company: body.company } : {}),
    },
  });

  return NextResponse.json({ prospect });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  await prisma.prospectAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
