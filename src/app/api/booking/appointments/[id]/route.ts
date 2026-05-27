import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.appointment.findUnique({ where: { id } });
  const updated  = await prisma.appointment.update({
    where: { id },
    data:  body,
    include: { service: true, staff: true },
  });

  // Sync cancellation to Google Calendar
  if (existing?.googleCalendarEventId) {
    if (body.status === 'CANCELLED') {
      deleteCalendarEvent(existing.googleCalendarEventId).catch(() => {});
    } else if (body.startTime || body.notes) {
      updateCalendarEvent(existing.googleCalendarEventId, {
        ...(body.startTime   ? { startTime:   new Date(body.startTime), durationMin: updated.durationMin } : {}),
        ...(body.notes       ? { description: body.notes } : {}),
      }).catch(() => {});
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.appointment.findUnique({ where: { id } });

  await prisma.appointment.delete({ where: { id } });

  if (existing?.googleCalendarEventId) {
    deleteCalendarEvent(existing.googleCalendarEventId).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
