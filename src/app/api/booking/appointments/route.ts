import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createCalendarEvent, isConnected } from '@/lib/google-calendar';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end   = searchParams.get('end');

  const where = start && end
    ? { startTime: { gte: new Date(start), lte: new Date(end) } }
    : {};

  const appointments = await prisma.appointment.findMany({
    where,
    include: { service: true, staff: true },
    orderBy: { startTime: 'asc' },
  });
  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const appointment = await prisma.appointment.create({
    data: body,
    include: { service: true, staff: true },
  });

  // Sync to Google Calendar if connected
  if (await isConnected()) {
    const attendees: string[] = [];
    if (appointment.patientEmail) attendees.push(appointment.patientEmail);

    const eventId = await createCalendarEvent({
      summary:     `${appointment.service?.name ?? 'Appointment'} — ${appointment.patientName}`,
      description: appointment.notes ?? undefined,
      startTime:   appointment.startTime,
      durationMin: appointment.durationMin,
      attendees,
    }).catch((err) => { console.error('[gcal] appointment sync failed:', err); return null; });

    if (eventId) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data:  { googleCalendarEventId: eventId },
      });
    }
  }

  return NextResponse.json(appointment, { status: 201 });
}
