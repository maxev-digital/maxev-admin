import { NextRequest, NextResponse } from 'next/server';
import { getNextBestActions } from '@/lib/claude';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest) {
  const leads = await prisma.lead.findMany({
    where: { stage: { notIn: ['LIVE', 'ON_RETAINER', 'DEAD'] } },
    orderBy: [{ priority: 'asc' }, { updatedAt: 'asc' }],
    take: 15,
    select: {
      businessName: true,
      stage: true,
      priority: true,
      estimatedValue: true,
      notes: true,
      updatedAt: true,
    },
  });

  const now = Date.now();
  const mapped = leads.map((l) => ({
    businessName: l.businessName,
    stage: l.stage,
    priority: l.priority,
    estimatedValue: l.estimatedValue,
    notes: l.notes,
    daysSinceContact: Math.floor((now - l.updatedAt.getTime()) / 86400000),
  }));

  let actions = '';
  try {
    actions = await getNextBestActions(mapped);
  } catch {
    // AI engine unavailable — empty actions still return
  }
  return NextResponse.json({ actions });
}
