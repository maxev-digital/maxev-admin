import { NextRequest, NextResponse } from 'next/server';
import { sendSms, sendAppointmentReminder, sendInvoiceReminder } from '@/lib/sms';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, to } = body;

  if (!to) return NextResponse.json({ error: 'to is required' }, { status: 400 });

  let result;

  switch (type) {
    case 'appointment_reminder':
      result = await sendAppointmentReminder(to, body);
      break;
    case 'invoice_reminder':
      result = await sendInvoiceReminder(to, body);
      break;
    default:
      if (!body.message) return NextResponse.json({ error: 'message is required for type=custom' }, { status: 400 });
      result = await sendSms(to, body.message);
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'SMS send failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sid: result.sid });
}
