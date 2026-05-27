import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const packets = await prisma.clientPacket.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(packets);
}

export async function POST(req: NextRequest) {
  const { name, contents, status } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const packet = await prisma.clientPacket.create({
    data: {
      name:     name.trim(),
      contents: Array.isArray(contents) ? contents.join('\n') : (contents ?? ''),
      status:   status ?? 'Active',
    },
  });
  return NextResponse.json(packet, { status: 201 });
}
