'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, ChevronDown, ChevronUp, Mail, MessageSquare, Phone, FileText } from 'lucide-react';

type Category = 'All' | 'Cold Email' | 'Follow-Up' | 'SMS' | 'Voicemail Script';

const CATEGORIES: Category[] = ['All', 'Cold Email', 'Follow-Up', 'SMS', 'Voicemail Script'];

const CATEGORY_BADGE: Record<string, string> = {
  'Cold Email':       'badge-blue',
  'Follow-Up':        'badge-orange',
  'SMS':              'badge-green',
  'Voicemail Script': 'badge-purple',
};

const CATEGORY_ICON: Record<string, typeof Mail> = {
  'Cold Email':       Mail,
  'Follow-Up':        Mail,
  'SMS':              MessageSquare,
  'Voicemail Script': Phone,
};

interface Template {
  id: string;
  name: string;
  category: Category;
  industry?: string;
  subject?: string;
  body: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'website-audit',
    name: 'Website Audit Offer',
    category: 'Cold Email',
    industry: 'General',
    subject: "Quick audit of [BusinessName]'s online presence",
    body: `Hi [FirstName],

I ran a quick audit of [BusinessName]'s online presence and found a few things that are likely costing you customers. Your Google Business Profile is missing [X] and your website isn't showing up for [keyword] searches in [City].

I help [Industry] businesses in DFW fix this — most see results in 30 days. We build the website, optimize Google, set up review automation, and hand you back a system that runs without you chasing it.

Would it be worth a 15-minute call this week to walk through what I found?

— Will
MAX EV Digital | maxevdigital.com`,
  },
  {
    id: 'google-problem',
    name: 'Google Business Problem',
    category: 'Cold Email',
    industry: 'Home Services',
    subject: '[BusinessName] isn\'t showing up on Google — here\'s why',
    body: `Hi [FirstName],

I was searching for [service type] in [City] and noticed [BusinessName] isn't coming up in the top results — even for your own business name in some cases.

For home service businesses, 80% of new jobs come from Google. If you're not on the first page, you're invisible to the customers who are actively looking right now.

I help plumbers, HVAC techs, and electricians in DFW dominate their local Google results in 30 days or less. Want me to show you exactly what needs to change for [BusinessName]?

15 minutes. No pressure. — Will`,
  },
  {
    id: 'no-reviews-followup',
    name: 'No Reviews Follow-Up',
    category: 'Follow-Up',
    industry: 'General',
    subject: 'Re: [BusinessName] — one more thing I noticed',
    body: `Hi [FirstName],

Following up on my last message. I dug a little deeper and noticed [BusinessName] has fewer than 10 Google reviews — which is hurting your rankings more than anything else right now.

Businesses with 50+ reviews get 3x the clicks, and most of your competitors already have them. The good news: we can automate review requests so every happy customer becomes a review without you lifting a finger.

Happy to show you how it works in 10 minutes this week. Worth a look?

— Will`,
  },
  {
    id: 'quick-question',
    name: 'Quick Question',
    category: 'Cold Email',
    industry: 'Restaurant',
    subject: 'Quick question, [FirstName]',
    body: `Hi [FirstName],

Quick question — when someone searches "[type of food] near me" in [City], is [BusinessName] the first place they find?

Most restaurants I talk to lose 20-30 customers a week to competitors who show up higher on Google and have better photos and more reviews. It's fixable, usually in a few weeks.

We specialize in helping DFW restaurants get found, build a loyal email list, and fill slow nights with targeted promotions. I'd love to show you what that looks like for [BusinessName].

Do you have 15 minutes this week? — Will`,
  },
  {
    id: 'built-for-industry',
    name: 'We Built Something for [Industry]',
    category: 'Cold Email',
    industry: 'General',
    subject: 'Built something for [Industry] businesses in DFW',
    body: `Hi [FirstName],

We just finished building a full digital platform specifically for [Industry] businesses in DFW — website, booking, CRM, review automation, and email marketing all connected in one dashboard.

I wanted to reach out to [BusinessName] directly because you're exactly the type of business this is built for. Most owners we work with were paying $600-$1,000/mo across 5 different tools that didn't talk to each other. We replace all of it for less.

I'd love to give you a 15-minute live demo — no slides, just the real thing. Interested?

— Will, MAX EV Digital`,
  },
  {
    id: 'checking-in',
    name: 'Checking In',
    category: 'Follow-Up',
    industry: 'General',
    subject: 'Checking in — [BusinessName]',
    body: `Hi [FirstName],

Just checking in — I know it's been a couple weeks since I reached out. Things get busy, totally get it.

I've been working with a few [Industry] businesses in [City] recently and the results have been solid. Figured it was worth one more try before I move on.

If there's ever a good time to chat for 10 minutes, I'm around. No pressure either way.

— Will`,
  },
  {
    id: 'last-touch',
    name: 'Last Touch',
    category: 'Follow-Up',
    industry: 'General',
    subject: 'Last one from me, [FirstName]',
    body: `Hi [FirstName],

I'll keep this short — this is my last follow-up, I promise.

If [BusinessName]'s online presence ever becomes a priority, I'd love to be the first call you make. We're fast, we're local, and we don't lock you into long contracts.

In the meantime, feel free to check out what we've built at maxevdigital.com. And if you ever want to revisit, my door is always open.

Wishing you a strong quarter either way.

— Will, MAX EV Digital`,
  },
  {
    id: 'sms-intro',
    name: 'SMS Intro Text',
    category: 'SMS',
    industry: 'General',
    body: `Hi [FirstName], this is Will from MAX EV Digital — I help local DFW businesses get found on Google and booked up. I did a quick audit of [BusinessName] and found a couple quick wins. Worth a 10-min call? Reply YES and I'll send a link. (Reply STOP to opt out)`,
  },
  {
    id: 'voicemail-drop',
    name: 'Voicemail Drop Script',
    category: 'Voicemail Script',
    industry: 'General',
    body: `"Hey [FirstName], this is Will calling from MAX EV Digital — we're a local DFW digital agency that helps [Industry] businesses get more leads online.

I did a quick audit of [BusinessName]'s online presence and found a couple things that are probably costing you leads every week. Nothing catastrophic, just some quick fixes that make a real difference.

I'd love to shoot you a 5-minute video walking through what I found — no obligation, just want to be helpful. Give me a call back at [YOUR NUMBER] or just text me and I'll send it over.

Have a great day."`,
  },
  {
    id: 'referral-ask',
    name: 'Referral Ask (Warm)',
    category: 'Follow-Up',
    industry: 'General',
    subject: 'Know anyone who could use this, [FirstName]?',
    body: `Hi [FirstName],

I know [BusinessName] may not be in the market right now — and that's totally fine.

But I wanted to ask: do you know any other [Industry] business owners in [City] who've been struggling with their online presence? We offer a $200 referral credit for any intro that turns into a client.

Either way, appreciate you taking the time to read this. Hope business is going well.

— Will, MAX EV Digital`,
  },
  {
    id: 'audit-report',
    name: 'Audit Report Delivery',
    category: 'Cold Email',
    industry: 'General',
    subject: 'Your free audit — [BusinessName]',
    body: `Hi [FirstName],

Attached is the quick audit I put together for [BusinessName]. Here's the summary:

- Google ranking: [X] for your main keywords in [City]
- Review score: [X] stars / [X] total reviews (competitors avg: [X])
- Website speed: [X] seconds load time (Google recommends under 3s)
- Missing: [specific missing element]

The good news — all of this is fixable, and most of it within 30 days.

I'd love to walk through this with you live so you can ask questions. Do you have 15 minutes this week?

— Will`,
  },
  {
    id: 'seasonal-promo',
    name: 'Seasonal Outreach',
    category: 'Cold Email',
    industry: 'Home Services',
    subject: '[Season] is your busiest time — is [BusinessName] ready?',
    body: `Hi [FirstName],

[Season] is right around the corner, which means [Industry] businesses across DFW are about to see a surge in demand. The businesses that show up first on Google right now are the ones that will capture that surge.

Is [BusinessName] positioned to capture it? If your Google presence, reviews, and website aren't dialed in yet, now is the time — not mid-season.

I help [Industry] businesses in DFW get ready in 30 days. Happy to show you what that looks like for your specific market. 15 minutes?

— Will, MAX EV Digital`,
  },
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

const subNav = [
  { label: 'Lead Queue',       href: '/leads' },
  { label: 'Templates',        href: '/leads/templates' },
  { label: 'Permit Leads',     href: '/leads/permits' },
  { label: 'Enrichment Queue', href: '/leads/enrichment' },
];

export default function LeadTemplatesPage() {
  const [category, setCategory]   = useState<Category>('All');
  const [expanded, setExpanded]   = useState<string[]>([]);
  const [copied, setCopied]       = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpanded((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function copyTemplate(t: Template) {
    const text = [
      t.subject ? `Subject: ${t.subject}\n` : '',
      t.body,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(t.id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const filtered = category === 'All' ? TEMPLATES : TEMPLATES.filter((t) => t.category === category);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Outreach Templates</h1>
          <p className="page-sub">{TEMPLATES.length} templates — copy-ready for cold outreach</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>{TEMPLATES.length} templates</span>
        </div>
      </div>

      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {subNav.map((n) => (
          <Link
            key={n.label}
            href={n.href}
            style={{
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: n.href === '/leads/templates' ? 'var(--white)' : 'var(--gray)',
              borderBottom: n.href === '/leads/templates' ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1,
              textDecoration: 'none',
            }}
          >
            {n.label}
          </Link>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {CATEGORIES.map((c) => {
          const count = c === 'All' ? TEMPLATES.length : TEMPLATES.filter((t) => t.category === c).length;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`btn btn-sm ${category === c ? 'btn-primary' : 'btn-ghost'}`}
            >
              {c}
              <span style={{
                marginLeft: 4,
                padding: '1px 6px',
                background: category === c ? 'rgba(255,255,255,0.2)' : 'var(--card2)',
                borderRadius: 10,
                fontSize: '0.65rem',
                fontWeight: 700,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Templates */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map((t) => {
          const isExpanded = expanded.includes(t.id);
          const isCopied = copied === t.id;
          const lines = t.body.split('\n');
          const previewLines = lines.slice(0, 3).join('\n');
          const hasMore = lines.length > 3;
          const Icon = CATEGORY_ICON[t.category] ?? FileText;

          return (
            <div key={t.id} className="card" style={{ padding: 22 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--card2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Icon size={16} style={{ color: 'var(--gray)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--white)', marginBottom: 6 }}>{t.name}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className={`badge ${CATEGORY_BADGE[t.category]}`} style={{ fontSize: '0.66rem' }}>{t.category}</span>
                      {t.industry && (
                        <span className="badge badge-gray" style={{ fontSize: '0.66rem' }}>{t.industry}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${isCopied ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => copyTemplate(t)}
                  style={{ flexShrink: 0, marginLeft: 12 }}
                >
                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Subject line */}
              {t.subject && (
                <div style={{ fontSize: '0.77rem', marginBottom: 10, padding: '6px 10px', background: 'var(--card2)', borderRadius: 6, display: 'inline-block' }}>
                  <span style={{ color: 'var(--gray)' }}>Subject: </span>
                  <span style={{ color: 'var(--light)', fontWeight: 500 }}>{t.subject}</span>
                </div>
              )}

              {/* Body */}
              <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', fontSize: '0.8rem', color: 'var(--light)', lineHeight: 1.75, whiteSpace: 'pre-line', marginBottom: 10 }}>
                {isExpanded ? t.body : previewLines}
                {!isExpanded && hasMore && (
                  <span style={{ color: 'var(--gray)' }}>...</span>
                )}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>
                    {t.body.length} chars
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>
                    {wordCount(t.body)} words
                  </span>
                </div>
                {hasMore && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleExpand(t.id)}
                    style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  >
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {isExpanded ? 'Collapse' : 'Show Full Template'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
