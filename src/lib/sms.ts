// Twilio SMS via REST API — no SDK dependency
// Required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE;
  if (!accountSid || !authToken || !from) return null;
  return { accountSid, authToken, from };
}

async function twilioPost(accountSid: string, authToken: string, body: Record<string, string>): Promise<{ sid?: string; status?: string; errorMessage?: string }> {
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const form = new URLSearchParams(body);
  const res  = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
    },
    body: form.toString(),
  });
  return res.json();
}

export async function sendSms(to: string, message: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const cfg = getTwilioConfig();
  if (!cfg) {
    console.warn('[sms] Twilio not configured — skipping SMS');
    return { ok: false, error: 'Twilio not configured' };
  }
  try {
    const result = await twilioPost(cfg.accountSid, cfg.authToken, {
      From: cfg.from,
      To:   to,
      Body: message,
    });
    if (result.errorMessage) {
      console.error('[sms] Twilio error:', result.errorMessage);
      return { ok: false, error: result.errorMessage };
    }
    return { ok: true, sid: result.sid };
  } catch (err) {
    console.error('[sms] Twilio fetch failed:', err);
    return { ok: false, error: String(err) };
  }
}

export async function sendAppointmentReminder(to: string, opts: {
  patientName: string;
  date: string;
  time: string;
  service: string;
  businessName?: string;
}): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const biz = opts.businessName ?? 'MAX EV Digital';
  const msg = `Hi ${opts.patientName}, this is a reminder from ${biz}. Your appointment for ${opts.service} is scheduled for ${opts.date} at ${opts.time}. Reply STOP to unsubscribe.`;
  return sendSms(to, msg);
}

export async function sendInvoiceReminder(to: string, opts: {
  clientName: string;
  amount: number;
  invoiceNumber: string;
  dueDate?: string;
}): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const due = opts.dueDate ? `, due ${opts.dueDate}` : '';
  const msg = `Hi ${opts.clientName}, invoice ${opts.invoiceNumber} for $${opts.amount.toLocaleString()}${due} is outstanding. Contact info@maxevdigital.com to arrange payment. Reply STOP to unsubscribe.`;
  return sendSms(to, msg);
}

export async function sendSupportTicketConfirmation(to: string, opts: {
  clientName: string;
  subject: string;
  ticketId: string;
}): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const ref = opts.ticketId.slice(0, 8).toUpperCase();
  const msg = `Hi ${opts.clientName}, we received your support request "${opts.subject}" (ref #${ref}). We'll respond shortly. Reply STOP to unsubscribe.`;
  return sendSms(to, msg);
}
