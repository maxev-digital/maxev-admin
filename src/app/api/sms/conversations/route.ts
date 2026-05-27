import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const history = await prisma.outreachHistory.findMany({
    where:   { channel: 'sms' },
    include: { prospect: true, lead: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  // Group by contact (prospect or lead)
  const groups = new Map<string, {
    key:       string;
    name:      string;
    business:  string;
    phone:     string | null;
    messages:  typeof history;
    lastMsg:   (typeof history)[0];
  }>();

  for (const record of history) {
    const contact = record.prospect ?? record.lead;
    if (!contact) continue;
    const key = `${record.prospectId ?? ''}_${record.leadId ?? ''}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name:     contact.contactName ?? contact.businessName,
        business: contact.businessName,
        phone:    (contact as { phone?: string | null }).phone ?? null,
        messages: [],
        lastMsg:  record,
      });
    }
    groups.get(key)!.messages.push(record);
    if (record.createdAt > groups.get(key)!.lastMsg.createdAt) {
      groups.get(key)!.lastMsg = record;
    }
  }

  const conversations = Array.from(groups.values()).map((g) => ({
    id:       g.key,
    name:     g.name,
    business: g.business,
    phone:    g.phone,
    lastMsg:  g.lastMsg.body ?? g.lastMsg.subject ?? 'SMS sent',
    lastAt:   g.lastMsg.createdAt.toISOString(),
    count:    g.messages.length,
    messages: g.messages.map((m) => ({
      id:        m.id,
      body:      m.body ?? m.subject ?? '',
      createdAt: m.createdAt.toISOString(),
      status:    m.status,
    })),
  }));

  conversations.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  return NextResponse.json(conversations);
}
