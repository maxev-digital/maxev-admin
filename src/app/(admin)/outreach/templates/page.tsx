import { prisma } from '@/lib/db';
import TemplatesList from './TemplatesList';

const HARDCODED_TEMPLATES = [
  {
    id: 'tpl-1',
    name: 'Cold Outreach - Presence Audit',
    category: 'Cold Email',
    subject: "Quick question about {businessName}'s online presence",
    body: `Hi {ownerName},

I came across {businessName} while researching businesses in {city} — and noticed your online presence could be significantly stronger.

I'm Will with MAX EV Digital, a DFW-based agency that builds complete digital platforms for local businesses: modern website, CRM, booking, billing, and automation — all connected.

Most businesses we work with see more leads within 30 days. Would a quick 15-minute call this week make sense?

Will Austin
MAX EV Digital
maxevdigital.com`,
  },
  {
    id: 'tpl-2',
    name: 'Follow Up - No Response',
    category: 'Follow-Up',
    subject: 'Following up — {businessName}',
    body: `Hi {ownerName},

Just wanted to follow up on my last email. I know things get busy.

I'd love to show you what we've built for similar businesses in {city}. Takes 15 minutes and you'll walk away with a clear picture of what's possible.

Are you open to a quick call this week?

Will
MAX EV Digital`,
  },
  {
    id: 'tpl-3',
    name: 'Demo Confirmation',
    category: 'Demo',
    subject: "Confirmed: Demo with MAX EV Digital — {demoDate}",
    body: `Hi {ownerName},

Your demo with MAX EV Digital is confirmed for {demoDate}.

What we'll cover:
- Live walkthrough of your industry's complete digital platform
- How it compares to your current setup
- Pricing and what it takes to get started

Join link: {zoomLink}

See you then!

Will Austin
MAX EV Digital
maxevdigital.com`,
  },
];

export default async function TemplatesPage() {
  const dbTemplates = await prisma.emailTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  const templates = dbTemplates.length > 0
    ? dbTemplates.map((t) => ({ id: t.id, name: t.name, category: t.category, subject: t.subject, body: t.bodyText ?? t.bodyHtml }))
    : HARDCODED_TEMPLATES;

  return <TemplatesList templates={templates} />;
}
