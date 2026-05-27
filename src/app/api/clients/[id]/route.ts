import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: true,
      proposals: true,
      invoices: true,
      activities: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(body.businessName !== undefined && { businessName: body.businessName }),
      ...(body.contactName !== undefined && { contactName: body.contactName }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.website !== undefined && { website: body.website }),
      ...(body.industry !== undefined && { industry: body.industry }),
      ...(body.city !== undefined && { city: body.city }),
      ...(body.state !== undefined && { state: body.state }),
      ...(body.packageTier !== undefined && { packageTier: body.packageTier }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.mrr !== undefined && { mrr: parseFloat(body.mrr) }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
  return NextResponse.json(client);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
