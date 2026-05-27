import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (body.incrementUse) {
    const macro = await prisma.helpdeskMacro.update({
      where: { id },
      data: { useCount: { increment: 1 } },
    });
    return NextResponse.json(macro);
  }

  const { title, body: macroBody, category } = body;
  const macro = await prisma.helpdeskMacro.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(macroBody && { body: macroBody }),
      ...(category && { category }),
    },
  });
  return NextResponse.json(macro);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.helpdeskMacro.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
