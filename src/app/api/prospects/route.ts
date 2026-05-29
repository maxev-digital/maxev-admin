import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const prospects = await prisma.prospect.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  return NextResponse.json(prospects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const prospect = await prisma.prospect.create({
    data: {
      businessName: body.businessName,
      contactName: body.contactName ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      website: body.website ?? null,
      industry: body.industry,
      city: body.city ?? null,
      state: body.state ?? null,
      presenceScore: body.presenceScore ? parseInt(body.presenceScore) : null,
      outreachStatus: body.outreachStatus ?? 'COLD',
      source: body.source ?? null,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(prospect, { status: 201 });
}
