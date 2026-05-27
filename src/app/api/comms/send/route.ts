import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sendCustomEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const { to, subject, body, channel, clientId } = await req.json() as {
      to: string;
      subject?: string;
      body: string;
      channel: 'email' | 'sms';
      clientId?: string;
    };

    if (!to || !body) {
      return NextResponse.json({ error: 'Missing to or body' }, { status: 400 });
    }

    if (channel === 'sms') {
      const result = await sendSms(to, body);
      if (!result.ok) {
        return NextResponse.json({ error: result.error ?? 'SMS failed' }, { status: 500 });
      }
      if (clientId) {
        await prisma.activity.create({
          data: {
            clientId,
            type: 'note',
            content: `SMS sent to ${to}: ${body.slice(0, 120)}${body.length > 120 ? '…' : ''}`,
          },
        }).catch(() => {});
      }
      return NextResponse.json({ ok: true, channel: 'sms', sid: result.sid });
    }

    // email
    if (!subject) {
      return NextResponse.json({ error: 'Missing subject for email' }, { status: 400 });
    }
    const result = await sendCustomEmail({ to, subject, body });
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Email failed' }, { status: 500 });
    }
    if (clientId) {
      await prisma.activity.create({
        data: {
          clientId,
          type: 'note',
          content: `Email sent to ${to} — "${subject}"`,
        },
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true, channel: 'email' });
  } catch (err) {
    console.error('[comms/send]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
