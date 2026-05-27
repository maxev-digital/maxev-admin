import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const templates = await prisma.emailTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const { name, category, subject, bodyText, bodyHtml, industry } = await req.json();
  if (!name || !subject || !(bodyHtml || bodyText)) {
    return NextResponse.json({ error: 'name, subject, and body are required' }, { status: 400 });
  }
  const template = await prisma.emailTemplate.create({
    data: {
      name,
      category:  category || 'Email',
      subject,
      bodyHtml:  bodyHtml || bodyText,
      bodyText:  bodyText || null,
      industry:  industry || null,
    },
  });
  return NextResponse.json(template, { status: 201 });
}
