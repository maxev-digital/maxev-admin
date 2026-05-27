import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, type, description, content } = await req.json();
  const template = await prisma.financeTemplate.update({
    where: { id },
    data: {
      ...(name        !== undefined && { name: name.trim() }),
      ...(type        !== undefined && { type }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(content     !== undefined && { content: content?.trim() || null }),
    },
  });
  return NextResponse.json(template);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.financeTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
