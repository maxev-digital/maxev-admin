import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, contents, status } = await req.json();
  const packet = await prisma.clientPacket.update({
    where: { id },
    data: {
      ...(name     !== undefined && { name: name.trim() }),
      ...(contents !== undefined && { contents: Array.isArray(contents) ? contents.join('\n') : contents }),
      ...(status   !== undefined && { status }),
    },
  });
  return NextResponse.json(packet);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.clientPacket.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
