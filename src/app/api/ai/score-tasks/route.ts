import { NextRequest, NextResponse } from 'next/server';
import { scoreTaskBatch } from '@/lib/claude';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { taskIds } = await req.json();

  if (!Array.isArray(taskIds) || !taskIds.length) {
    return NextResponse.json({ error: 'taskIds array required' }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: { id: { in: taskIds } },
    select: { id: true, title: true, notes: true, dueDate: true, linkedType: true },
  });

  if (!tasks.length) return NextResponse.json([]);

  const scored = await scoreTaskBatch(
    tasks.map((t) => ({
      id:         t.id,
      title:      t.title,
      notes:      t.notes,
      dueDate:    t.dueDate ? t.dueDate.toISOString() : null,
      linkedType: t.linkedType,
    }))
  );

  // Clamp URGENT → HIGH (Prisma enum doesn't include URGENT)
  const clamped = scored.map((s) => ({
    ...s,
    dbPriority: (s.priority === 'URGENT' ? 'HIGH' : s.priority) as 'HIGH' | 'MEDIUM' | 'LOW',
  }));

  // Persist AI scores back to DB
  await Promise.all(
    clamped.map((s) =>
      prisma.task.update({ where: { id: s.id }, data: { priority: s.dbPriority } }).catch(() => null)
    )
  );

  return NextResponse.json(scored);
}
