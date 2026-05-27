import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospect = await prisma.prospect.findUnique({ where: { id } });
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(prospect);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const prospect = await prisma.prospect.update({
    where: { id },
    data: {
      ...(body.outreachStatus !== undefined && { outreachStatus: body.outreachStatus }),
      ...(body.lastContactAt !== undefined && {
        lastContactAt: body.lastContactAt ? new Date(body.lastContactAt) : null,
      }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.businessName !== undefined && { businessName: body.businessName }),
      ...(body.contactName !== undefined && { contactName: body.contactName }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.website !== undefined && { website: body.website }),
      ...(body.industry !== undefined && { industry: body.industry }),
      ...(body.city !== undefined && { city: body.city }),
      ...(body.state !== undefined && { state: body.state }),
    },
  });
  return NextResponse.json(prospect);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.prospect.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
