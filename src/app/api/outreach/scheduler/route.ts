import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const [sequences, upcomingEnrollments] = await Promise.all([
    prisma.emailSequence.findMany({
      include: {
        steps:       { orderBy: { stepNumber: 'asc' } },
        enrollments: { where: { status: 'ACTIVE' }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.sequenceEnrollment.findMany({
      where: {
        status:     'ACTIVE',
        nextSendAt: { not: null, gte: new Date() },
      },
      include: { sequence: { select: { name: true, steps: { select: { stepNumber: true } } } } },
      orderBy: { nextSendAt: 'asc' },
      take: 20,
    }),
  ]);

  const workflows = sequences.map((seq) => ({
    id:           seq.id,
    name:         seq.name,
    isActive:     seq.isActive,
    trigger:      seq.trigger,
    steps:        seq.steps.map((s) => ({
      timing: s.dayOffset === 0 ? 'Instant' : `Day ${s.dayOffset}`,
      label:  s.subject,
    })),
    enrolled:     seq.enrollments.length,
    stepCount:    seq.steps.length,
  }));

  const upcoming = upcomingEnrollments.map((e) => ({
    id:           e.id,
    nextSendAt:   e.nextSendAt!.toISOString(),
    contactName:  e.contactName,
    contactEmail: e.contactEmail,
    sequenceName: e.sequence.name,
    currentStep:  e.currentStep + 1,
    totalSteps:   e.sequence.steps.length,
  }));

  return NextResponse.json({ workflows, upcoming });
}
