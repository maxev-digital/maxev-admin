import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { note } = await req.json();

  if (!note?.trim()) {
    return NextResponse.json({ error: 'Note is required' }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const entry = await prisma.activityLog.create({
    data: {
      leadId:      id,
      type:        'NOTE',
      description: note.trim(),
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
