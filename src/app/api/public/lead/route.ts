import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendOwnerNewLeadAlert } from '@/lib/email';
import { sendSms } from '@/lib/sms';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

async function sendTelegramAlert(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

export async function POST(req: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await req.json();
    const { businessName, contactName, email, phone, industry, serviceInterest, message } = body;

    if (!businessName || !industry) {
      return NextResponse.json(
        { error: 'businessName and industry are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        businessName: String(businessName).trim(),
        contactName:  contactName ? String(contactName).trim() : null,
        email:        email        ? String(email).trim().toLowerCase() : null,
        phone:        phone        ? String(phone).trim() : null,
        industry:     String(industry).trim(),
        source:       'Web Form',
        notes:        [
          serviceInterest ? `Service Interest: ${serviceInterest}` : null,
          message ? `Message: ${message}` : null,
        ].filter(Boolean).join('\n') || null,
        stage:    'LEAD',
        priority: 'WARM',
      },
    });

    sendOwnerNewLeadAlert({
      businessName: lead.businessName,
      contactName:  lead.contactName,
      email:        lead.email,
      phone:        lead.phone,
      industry:     lead.industry,
      source:       lead.source,
      notes:        lead.notes,
    }).catch((err) => console.error('[email] owner alert failed:', err));

    const ownerPhone = process.env.OWNER_PHONE;
    if (ownerPhone) {
      const smsBody = `New lead: ${lead.businessName} (${lead.industry})${lead.contactName ? ` — ${lead.contactName}` : ''}${lead.phone ? ` · ${lead.phone}` : ''}${lead.email ? ` · ${lead.email}` : ''}`;
      sendSms(ownerPhone, smsBody).catch((err) => console.error('[sms] owner alert failed:', err));
    }

    const lines = [
      `<b>New Lead — MAX EV Digital</b>`,
      `Business: ${lead.businessName}`,
      `Industry: ${lead.industry}`,
      lead.contactName ? `Contact: ${lead.contactName}` : null,
      lead.phone       ? `Phone: ${lead.phone}`         : null,
      lead.email       ? `Email: ${lead.email}`         : null,
      lead.notes       ? `Notes: ${lead.notes}`         : null,
    ].filter(Boolean).join('\n');
    sendTelegramAlert(lines).catch((err) => console.error('[telegram] lead alert failed:', err));

    return NextResponse.json({ success: true, id: lead.id }, { headers: corsHeaders });
  } catch (err) {
    console.error('[public/lead] error:', err);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500, headers: corsHeaders }
    );
  }
}
