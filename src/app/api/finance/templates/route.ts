import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const templates = await prisma.financeTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const { name, type, description, content } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const template = await prisma.financeTemplate.create({
    data: {
      name:        name.trim(),
      type:        type ?? 'Document',
      description: description?.trim() || null,
      content:     content?.trim() || null,
    },
  });
  return NextResponse.json(template, { status: 201 });
}
