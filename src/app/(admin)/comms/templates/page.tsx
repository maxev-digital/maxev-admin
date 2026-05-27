import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { prisma } from '@/lib/db';

const CATEGORIES = ['Cold Outreach', 'Follow-Up', 'Proposal', 'Onboarding', 'Newsletter'] as const;

const CATEGORY_BADGE: Record<string, string> = {
  'Cold Outreach': 'badge-blue',
  'Follow-Up':     'badge-orange',
  'Proposal':      'badge-green',
  'Onboarding':    'badge-green',
  'Newsletter':    'badge-gray',
};

type TemplateCard = {
  id: string;
  name: string;
  category: string;
  subject: string;
  industry: string | null;
  isDefault: boolean;
  bodyText: string | null;
};

const STARTER_TEMPLATES: TemplateCard[] = [
  {
    id: 'starter-1',
    name: 'Cold Outreach — Website Audit',
    category: 'Cold Outreach',
    subject: "Quick thought about [Business Name]'s online presence",
    industry: 'General',
    isDefault: true,
    bodyText:
      'Hi [Name], I came across [Business Name] and noticed a few quick wins that could improve your Google visibility and lead flow. Would you be open to a 15-minute call this week? — Max EV Digital',
  },
  {
    id: 'starter-2',
    name: 'Follow-Up #2',
    category: 'Follow-Up',
    subject: 'Following up — [Business Name]',
    industry: 'General',
    isDefault: true,
    bodyText:
      "Hi [Name], just circling back on my last note. We've helped local businesses in [City] increase their leads by 30-60% in the first 90 days. Happy to share a quick audit if it would be helpful.",
  },
  {
    id: 'starter-3',
    name: 'Proposal Sent',
    category: 'Proposal',
    subject: 'Your proposal from Max EV Digital is ready',
    industry: 'General',
    isDefault: false,
    bodyText:
      "Hi [Name], I've attached your custom proposal for [Package]. It covers everything we discussed — website build, SEO, and monthly reporting. Let me know if you have any questions or want to jump on a call to review.",
  },
  {
    id: 'starter-4',
    name: 'Client Welcome',
    category: 'Onboarding',
    subject: 'Welcome to Max EV Digital — next steps',
    industry: 'General',
    isDefault: true,
    bodyText:
      "Hi [Name], welcome aboard! We're excited to get started on [Project]. You'll hear from us within 1 business day to schedule your kickoff call. In the meantime, here's what to expect in the first 30 days...",
  },
];

export default async function TemplatesPage() {
  const rawTemplates = await prisma.emailTemplate.findMany({ orderBy: { createdAt: 'desc' } });

  const isEmpty = rawTemplates.length === 0;

  // Normalize Prisma results to TemplateCard shape
  const templates: TemplateCard[] = rawTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    subject: t.subject,
    industry: t.industry,
    isDefault: t.isDefault,
    bodyText: t.bodyText ?? null,
  }));

  // Count per category
  const catCounts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = templates.filter((t) => t.category === cat).length;
    return acc;
  }, {});

  const displayTemplates: TemplateCard[] = isEmpty ? STARTER_TEMPLATES : templates;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Email Templates</h1>
          <p className="page-sub">Reusable templates for outreach, follow-ups, proposals, and onboarding</p>
        </div>
        <Link href="/comms/templates/new" className="btn btn-primary btn-sm">
          <Plus size={13} /> New Template
        </Link>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
        <div className="card-blue" style={{ padding: 16 }}>
          <div className="kpi-value" style={{ fontSize: '1.6rem' }}>{templates.length}</div>
          <div className="kpi-label" style={{ marginTop: 4 }}>Total</div>
        </div>
        {CATEGORIES.map((cat) => (
          <div key={cat} className="card" style={{ padding: 16 }}>
            <div className="kpi-value" style={{ fontSize: '1.4rem', color: 'var(--light)' }}>
              {isEmpty ? 0 : catCounts[cat]}
            </div>
            <div className="kpi-label" style={{ marginTop: 4, fontSize: '0.7rem' }}>{cat}</div>
          </div>
        ))}
      </div>

      {/* Empty state notice */}
      {isEmpty && (
        <div
          style={{
            background: 'rgba(37,99,235,0.08)',
            border: '1px solid rgba(37,99,235,0.2)',
            borderRadius: 10,
            padding: '14px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--light)' }}>
            No templates saved yet. Below are starter templates you can import or use as a reference.
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={undefined}
            title="Import defaults (coming soon)"
          >
            Import Defaults
          </button>
        </div>
      )}

      {/* Category filter tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {['All', ...CATEGORIES].map((tab, i) => (
          <span
            key={tab}
            style={{
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: i === 0 ? 'var(--white)' : 'var(--gray)',
              borderBottom: i === 0 ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1,
              cursor: 'default',
              userSelect: 'none',
            }}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Template cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {displayTemplates.map((t) => (
          <div key={t.id} className="card" style={{ padding: 20 }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 38, height: 38, borderRadius: 8,
                  background: 'rgba(37,99,235,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <FileText size={16} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: '0.9rem' }}>{t.name}</span>
                  <span
                    className={`badge ${CATEGORY_BADGE[t.category] ?? 'badge-gray'}`}
                    style={{ fontSize: '0.65rem' }}
                  >
                    {t.category}
                  </span>
                  {t.isDefault && (
                    <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>Default</span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginBottom: 2 }}>
                  <span style={{ color: 'var(--light)', fontStyle: 'italic' }}>{t.subject}</span>
                </div>
                {t.industry && (
                  <div style={{ marginTop: 4 }}>
                    <span className="badge badge-gray" style={{ fontSize: '0.6rem' }}>{t.industry}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Expandable preview */}
            <details style={{ marginBottom: 14 }}>
              <summary
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  listStyle: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Preview body text
              </summary>
              <div
                style={{
                  marginTop: 10,
                  padding: '12px 14px',
                  background: 'var(--card2)',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  color: 'var(--light)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  borderLeft: '3px solid var(--border)',
                }}
              >
                {t.bodyText ?? 'No plain-text version saved.'}
              </div>
            </details>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href={`/comms/templates/${t.id}/edit`} className="btn btn-ghost btn-sm">
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
