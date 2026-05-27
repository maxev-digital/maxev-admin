import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const clients = await prisma.client.findMany({ orderBy: { mrr: 'desc' } });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const client = await prisma.client.create({
    data: {
      businessName: body.businessName,
      contactName: body.contactName ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      website: body.website ?? null,
      industry: body.industry,
      city: body.city ?? null,
      state: body.state ?? null,
      packageTier: body.packageTier ?? 'STARTER',
      mrr: body.mrr ? parseFloat(body.mrr) : 0,
      notes: body.notes ?? null,
      launchDate: body.launchDate ? new Date(body.launchDate) : null,
    },
  });
  return NextResponse.json(client, { status: 201 });
}
