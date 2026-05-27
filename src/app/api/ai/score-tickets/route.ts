import { NextRequest, NextResponse } from 'next/server';
import { scoreTicketBatch } from '@/lib/claude';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { ticketIds } = await req.json() as { ticketIds: string[] };
  if (!ticketIds?.length) return NextResponse.json([]);

  const tickets = await prisma.ticket.findMany({
    where: { id: { in: ticketIds } },
    select: { id: true, subject: true, body: true },
  });

  const scored = await scoreTicketBatch(tickets);

  // Persist AI-scored priorities back to DB
  await Promise.all(
    scored.map((s) =>
      prisma.ticket.update({
        where: { id: s.id },
        data: { priority: s.priority },
      })
    )
  );

  return NextResponse.json(scored);
}
