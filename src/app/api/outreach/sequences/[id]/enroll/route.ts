import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { contactEmail, contactName, contactType, contactId } = await req.json();

  if (!contactEmail || !contactName) {
    return NextResponse.json({ error: 'contactEmail and contactName are required' }, { status: 400 });
  }

  // Check sequence exists and has steps
  const sequence = await prisma.emailSequence.findUnique({
    where: { id },
    include: { steps: { orderBy: { stepNumber: 'asc' } } },
  });
  if (!sequence) return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });

  // Check not already enrolled
  const existing = await prisma.sequenceEnrollment.findFirst({
    where: { sequenceId: id, contactEmail, status: 'ACTIVE' },
  });
  if (existing) return NextResponse.json({ error: 'Already enrolled' }, { status: 409 });

  const firstStep = sequence.steps[0];
  const nextSendAt = firstStep
    ? new Date(Date.now() + firstStep.dayOffset * 86400000)
    : null;

  const enrollment = await prisma.sequenceEnrollment.create({
    data: {
      sequenceId:   id,
      contactEmail,
      contactName,
      contactType:  contactType || 'lead',
      contactId:    contactId || null,
      status:       'ACTIVE',
      currentStep:  0,
      nextSendAt,
    },
  });

  return NextResponse.json(enrollment, { status: 201 });
}
