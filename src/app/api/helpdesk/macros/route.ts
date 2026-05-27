import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const macros = await prisma.helpdeskMacro.findMany({ orderBy: { useCount: 'desc' } });
  return NextResponse.json(macros);
}

export async function POST(req: NextRequest) {
  const { title, body, category } = await req.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
  }
  const macro = await prisma.helpdeskMacro.create({
    data: { title: title.trim(), body: body.trim(), category: category || 'General' },
  });
  return NextResponse.json(macro, { status: 201 });
}
