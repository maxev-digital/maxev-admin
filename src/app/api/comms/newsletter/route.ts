import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendNewsletter } from '@/lib/email';

export async function GET() {
  const [broadcasts, subCounts] = await Promise.all([
    prisma.newsletterBroadcast.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.subscriber.groupBy({
      by: ['listType'],
      _count: { id: true },
      where: { status: 'active' },
    }),
  ]);

  const allCount      = await prisma.subscriber.count({ where: { status: 'active' } });
  const prospectsCount = subCounts.find((s) => s.listType === 'PROSPECT')?._count.id ?? 0;
  const clientsCount   = subCounts.find((s) => s.listType === 'CLIENT')?._count.id ?? 0;
  const newsletterCount = subCounts.find((s) => s.listType === 'NEWSLETTER')?._count.id ?? 0;

  return NextResponse.json({
    broadcasts,
    audienceCounts: {
      all:       allCount,
      prospects: prospectsCount,
      clients:   clientsCount,
      newsletter: newsletterCount,
    },
  });
}

export async function POST(req: NextRequest) {
  const { subject, body, audience, action } = await req.json();
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'subject and body are required' }, { status: 400 });
  }

  if (action === 'draft') {
    const broadcast = await prisma.newsletterBroadcast.create({
      data: { subject: subject.trim(), body: body.trim(), audience: audience || 'all', status: 'draft' },
    });
    return NextResponse.json(broadcast, { status: 201 });
  }

  // action === 'send'
  const whereClause =
    audience === 'prospects'  ? { listType: 'PROSPECT' as const }
    : audience === 'clients'  ? { listType: 'CLIENT' as const }
    : audience === 'newsletter' ? { listType: 'NEWSLETTER' as const }
    : {};

  const recipients = await prisma.subscriber.findMany({
    where: { status: 'active', ...whereClause },
    select: { email: true, name: true },
  });

  let sent = 0;
  for (const r of recipients) {
    try {
      const ok = await sendNewsletter({
        toEmail: r.email,
        toName:  r.name || r.email,
        subject: subject.trim(),
        body:    body.trim(),
        unsubscribeEmail: process.env.SMTP_USER_INFO,
      });
      if (ok) sent++;
    } catch {
      // continue on individual failure
    }
  }

  const broadcast = await prisma.newsletterBroadcast.create({
    data: {
      subject:        subject.trim(),
      body:           body.trim(),
      audience:       audience || 'all',
      status:         'sent',
      recipientCount: sent,
      sentAt:         new Date(),
    },
  });

  return NextResponse.json({ ...broadcast, sent }, { status: 201 });
}
