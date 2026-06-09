import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import nodemailer from 'nodemailer';

async function getTransport(accountId?: string) {
  // Try to load SMTP config from DB account first
  if (accountId) {
    const acct = await prisma.emailAccount.findUnique({ where: { id: accountId } });
    if (acct && acct.smtpPass) {
      return {
        transport: nodemailer.createTransport({
          host: acct.smtpHost,
          port: acct.smtpPort,
          secure: true,
          auth: { user: acct.email, pass: acct.smtpPass },
        }),
        fromEmail: acct.email,
        fromName:  acct.fromName,
        acctId:    acct.id,
      };
    }
  }

  // Fall back: any active account with a password
  const anyAcct = await prisma.emailAccount.findFirst({
    where: { isActive: true, smtpPass: { not: '' } },
    orderBy: { createdAt: 'asc' },
  });
  if (anyAcct) {
    return {
      transport: nodemailer.createTransport({
        host: anyAcct.smtpHost,
        port: anyAcct.smtpPort,
        secure: true,
        auth: { user: anyAcct.email, pass: anyAcct.smtpPass },
      }),
      fromEmail: anyAcct.email,
      fromName:  anyAcct.fromName,
      acctId:    anyAcct.id,
    };
  }

  // Final fallback: env vars
  const fromEmail = process.env.IMAP_USER || process.env.SMTP_USER_INFO || '';
  return {
    transport: nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: { user: fromEmail, pass: process.env.IMAP_PASS || process.env.SMTP_PASS || '' },
    }),
    fromEmail,
    fromName: 'Max EV Digital',
    acctId:   null as string | null,
  };
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { to, cc, bcc, subject, bodyHtml, bodyText, inReplyTo, replyToMessageId, leadId, clientId, accountId } = await req.json();

    if (!to?.trim() || !subject?.trim()) {
      return NextResponse.json({ error: 'to and subject are required' }, { status: 400 });
    }

    const { transport, fromEmail, fromName, acctId } = await getTransport(accountId);

    const headers: Record<string, string> = {};
    if (inReplyTo)        headers['In-Reply-To'] = inReplyTo;
    if (replyToMessageId) headers['References']  = replyToMessageId;

    await transport.sendMail({
      from:    `"${fromName}" <${fromEmail}>`,
      to,
      cc:      cc  || undefined,
      bcc:     bcc || undefined,
      subject,
      html:    bodyHtml || bodyText || '',
      text:    bodyText || '',
      headers,
    });

    const msgId = `<sent-${Date.now()}-${Math.random().toString(36).slice(2)}@maxevdigital.com>`;
    const refList = replyToMessageId ? replyToMessageId.trim().split(/\s+/) : [];
    const threadId = refList[0] || inReplyTo || msgId;

    const saved = await prisma.emailMessage.create({
      data: {
        accountId:  acctId || 'main',
        messageId:  msgId,
        folder:     'Sent',
        subject,
        fromEmail,
        fromName,
        toRaw:      JSON.stringify([{ address: to }]),
        ccRaw:      cc ? JSON.stringify([{ address: cc }]) : null,
        bodyHtml:   bodyHtml || null,
        bodyText:   bodyText || null,
        snippet:    (bodyText || '').replace(/\s+/g, ' ').slice(0, 220),
        isRead:     true,
        isSent:     true,
        threadId,
        inReplyTo:  inReplyTo || null,
        receivedAt: new Date(),
        leadId:     leadId   || null,
        clientId:   clientId || null,
      },
    });

    return NextResponse.json({ ok: true, message: saved });
  } catch (err) {
    console.error('[email/send]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 });
  }
}
