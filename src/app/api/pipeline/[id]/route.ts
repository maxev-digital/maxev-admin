import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, isConnected } from '@/lib/google-calendar';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      activities:     { orderBy: { createdAt: 'desc' } },
      outreachHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.lead.findUnique({ where: { id } });

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(body.stage          !== undefined && { stage:          body.stage }),
      ...(body.priority       !== undefined && { priority:       body.priority }),
      ...(body.notes          !== undefined && { notes:          body.notes }),
      ...(body.demoDate       !== undefined && { demoDate:       body.demoDate ? new Date(body.demoDate) : null }),
      ...(body.estimatedValue !== undefined && { estimatedValue: body.estimatedValue !== null ? parseFloat(body.estimatedValue) : null }),
    },
  });

  // Auto-log stage changes
  if (body.stage && existing?.stage !== body.stage) {
    prisma.activityLog.create({
      data: {
        leadId:      id,
        type:        'STAGE_CHANGE',
        description: `Stage changed from ${existing?.stage ?? 'unknown'} to ${body.stage}`,
        metadata:    { from: existing?.stage, to: body.stage, demoDate: body.demoDate ?? null },
      },
    }).catch(() => {});
  }

  // Sync demo scheduling to Google Calendar
  const schedulingDemo = body.stage === 'DEMO_SCHEDULED' && body.demoDate;
  const clearingDemo   = body.stage !== undefined && body.stage !== 'DEMO_SCHEDULED';

  if (await isConnected()) {
    if (schedulingDemo) {
      const demoDate = new Date(body.demoDate);
      if (existing?.googleCalendarEventId) {
        // Update existing event
        updateCalendarEvent(existing.googleCalendarEventId, {
          summary:    `Demo — ${lead.businessName}`,
          startTime:  demoDate,
          durationMin: 60,
          description: lead.notes ?? undefined,
        }).catch((err) => console.error('[gcal] demo update failed:', err));
      } else {
        // Create new event
        const attendees: string[] = [];
        if (lead.email) attendees.push(lead.email);

        createCalendarEvent({
          summary:     `Demo — ${lead.businessName}`,
          description: `${lead.contactName ? `Contact: ${lead.contactName}\n` : ''}${lead.industry} | ${lead.city ?? ''}\n${lead.notes ?? ''}`.trim(),
          startTime:   demoDate,
          durationMin: 60,
          attendees,
        }).then((eventId) => {
          if (eventId) {
            prisma.lead.update({ where: { id }, data: { googleCalendarEventId: eventId } }).catch(() => {});
          }
        }).catch((err) => console.error('[gcal] demo create failed:', err));
      }
    } else if (clearingDemo && existing?.googleCalendarEventId) {
      deleteCalendarEvent(existing.googleCalendarEventId).catch(() => {});
      await prisma.lead.update({ where: { id }, data: { googleCalendarEventId: null } });
    }
  }

  return NextResponse.json(lead);
}
