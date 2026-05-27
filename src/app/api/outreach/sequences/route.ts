import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const sequences = await prisma.emailSequence.findMany({
    include: {
      steps:       { orderBy: { stepNumber: 'asc' } },
      enrollments: { where: { status: 'ACTIVE' }, select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(sequences);
}

export async function POST(req: NextRequest) {
  const { name, description, trigger, steps } = await req.json();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const sequence = await prisma.emailSequence.create({
    data: {
      name,
      description: description || null,
      trigger:     trigger || 'manual',
      steps: steps?.length
        ? {
            create: (steps as Array<{ dayOffset: number; subject: string; body: string }>).map((s, i) => ({
              stepNumber: i + 1,
              dayOffset:  s.dayOffset ?? i * 3,
              subject:    s.subject,
              body:       s.body,
            })),
          }
        : undefined,
    },
    include: { steps: { orderBy: { stepNumber: 'asc' } } },
  });

  return NextResponse.json(sequence, { status: 201 });
}
