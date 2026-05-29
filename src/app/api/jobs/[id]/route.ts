import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.status       !== undefined) update.status       = body.status;
  if (body.appliedAt    !== undefined) update.appliedAt    = body.appliedAt ? new Date(body.appliedAt) : null;
  if (body.notes        !== undefined) update.notes        = body.notes;
  if (body.applyUrl     !== undefined) update.applyUrl     = body.applyUrl;
  if (body.pdfFilename  !== undefined) update.pdfFilename  = body.pdfFilename;
  if (body.matchScore   !== undefined) update.matchScore   = body.matchScore ? Number(body.matchScore) : null;
  if (body.tags         !== undefined) update.tags         = Array.isArray(body.tags) ? body.tags : [];
  if (body.postedDate   !== undefined) update.postedDate   = body.postedDate ? new Date(body.postedDate) : null;
  if (body.companyStage !== undefined) update.companyStage = body.companyStage;

  const job = await prisma.jobApplication.update({
    where: { id },
    data: update,
  });
  return NextResponse.json(job);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.jobApplication.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
