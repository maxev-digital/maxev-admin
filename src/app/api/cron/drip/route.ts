import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import nodemailer from 'nodemailer';

// Called by a cron job or PM2 scheduled task
// Sends due sequence emails and advances enrollment state
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const dueEnrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      status:    'ACTIVE',
      nextSendAt: { lte: now },
    },
    include: {
      sequence: {
        include: { steps: { orderBy: { stepNumber: 'asc' } } },
      },
    },
    take: 50,
  });

  const results: Array<{ enrollmentId: string; to: string; subject: string; status: string }> = [];

  for (const enrollment of dueEnrollments) {
    const { sequence } = enrollment;
    const nextStepIndex = enrollment.currentStep;
    const step = sequence.steps[nextStepIndex];

    if (!step) {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'COMPLETED' },
      });
      continue;
    }

    const personalizedSubject = step.subject
      .replace(/\{\{name\}\}/gi, enrollment.contactName)
      .replace(/\{\{email\}\}/gi, enrollment.contactEmail);

    const personalizedBody = step.body
      .replace(/\{\{name\}\}/gi, enrollment.contactName)
      .replace(/\{\{email\}\}/gi, enrollment.contactEmail);

    let sendStatus = 'skipped';

    try {
      const host = process.env.SMTP_HOST;
      const pass = process.env.SMTP_PASS;
      const user = process.env.SMTP_USER_INFO || 'info@maxevdigital.com';

      if (host && pass) {
        const t = nodemailer.createTransport({
          host,
          port:   parseInt(process.env.SMTP_PORT || '465'),
          secure: (process.env.SMTP_PORT || '465') === '465',
          auth:   { user, pass },
        });
        await t.sendMail({
          from:    `"${step.fromName}" <${user}>`,
          to:      enrollment.contactEmail,
          subject: personalizedSubject,
          text:    personalizedBody,
          html:    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333;line-height:1.7;">${personalizedBody.replace(/\n/g, '<br>')}</div>`,
        });
        sendStatus = 'sent';
      }
    } catch (err) {
      console.error('[drip] email send failed:', err);
      sendStatus = 'failed';
    }

    // Advance to next step
    const nextIndex = nextStepIndex + 1;
    const nextStep  = sequence.steps[nextIndex];
    const nextSendAt = nextStep
      ? new Date(Date.now() + nextStep.dayOffset * 86400000)
      : null;

    await Promise.all([
      prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStep: nextIndex,
          nextSendAt,
          status: nextStep ? 'ACTIVE' : 'COMPLETED',
        },
      }),
      prisma.outreachHistory.create({
        data: {
          channel:    'email',
          subject:    personalizedSubject,
          body:       personalizedBody,
          status:     sendStatus,
          ...(enrollment.contactType === 'prospect' && enrollment.contactId
            ? { prospectId: enrollment.contactId }
            : enrollment.contactId
              ? { leadId: enrollment.contactId }
              : {}),
        },
      }),
    ]);

    results.push({ enrollmentId: enrollment.id, to: enrollment.contactEmail, subject: personalizedSubject, status: sendStatus });
  }

  return NextResponse.json({ processed: results.length, results });
}

// Also handle GET for health checks
export async function GET() {
  const pending = await prisma.sequenceEnrollment.count({
    where: { status: 'ACTIVE', nextSendAt: { lte: new Date() } },
  });
  return NextResponse.json({ pending });
}
