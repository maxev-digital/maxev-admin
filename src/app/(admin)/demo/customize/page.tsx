'use client';

import { useState } from 'react';
import { Sliders, Eye, Copy, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const INDUSTRIES = [
  'Home Services', 'Restaurant', 'Dental', 'Legal', 'Real Estate',
  'Automotive', 'Healthcare', 'Fitness / Gym', 'Beauty / Salon', 'Technology',
  'Roofing', 'HVAC', 'Landscaping', 'Childcare', 'Cleaning', 'Insurance',
  'Auto Repair', 'Retail', 'Plumbing', 'Electrical', 'Flooring',
  'Pest Control', 'Pool / Spa', 'Photography', 'Accounting',
];

const REVENUE_OPTIONS = [
  'Under $50k / mo',
  '$50k – $150k / mo',
  '$150k – $500k / mo',
  '$500k+ / mo',
];

const PAIN_POINTS = [
  { id: 'no_website',       label: 'No website' },
  { id: 'old_site',         label: 'Old / outdated site' },
  { id: 'no_google',        label: 'No Google presence' },
  { id: 'no_reviews',       label: 'No online reviews' },
  { id: 'no_email',         label: 'No email marketing' },
  { id: 'no_crm',           label: 'No CRM' },
  { id: 'manual_invoicing', label: 'Manual invoicing' },
];

const INDUSTRY_MODULES: Record<string, string[]> = {
  'Home Services':  ['Website & SEO', 'CRM & Pipeline', 'Online Booking', 'Invoicing & Billing', 'Email & SMS Automation', 'Review Management', 'Task Management', 'Analytics'],
  'Restaurant':     ['Online Reservations', 'CRM & Loyalty', 'Marketing Automation', 'Email & SMS Campaigns', 'Review Management', 'Social Media', 'Inventory & Ops', 'Analytics'],
  'Dental':         ['Online Booking', 'CRM & Patient Records', 'Billing & Invoicing', 'Recall Email & SMS', 'Review Management', 'Helpdesk', 'Inventory (Supplies)', 'Analytics'],
  'Legal':          ['CRM & Intake Pipeline', 'Client Portal', 'Billing & Retainers', 'Email Automation', 'Task & Deadline Tracking', 'Helpdesk', 'Document Management', 'Analytics'],
  'Real Estate':    ['CRM & Lead Pipeline', 'Email & SMS Drip', 'Online Booking (Showings)', 'Social Media', 'Landing Pages', 'Task Management', 'Analytics'],
  'Automotive':     ['CRM & Service Pipeline', 'Online Booking', 'Invoicing & Billing', 'Email & SMS Reminders', 'Review Management', 'Inventory (Parts)', 'Helpdesk', 'Analytics'],
  'Healthcare':     ['Online Booking', 'CRM & Patient Records', 'Billing & Invoicing', 'Email & SMS Reminders', 'Review Management', 'Helpdesk', 'Inventory (Supplies)', 'Analytics'],
  'Fitness / Gym':  ['Online Booking (Classes)', 'CRM & Member Management', 'Recurring Billing', 'Email & SMS Automation', 'Social Media', 'Review Management', 'Inventory (Merch)', 'Analytics'],
  'Beauty / Salon': ['Online Booking', 'CRM & Client History', 'Billing & Invoicing', 'Email & SMS Reminders', 'Review Management', 'Social Media', 'Retail Inventory', 'Analytics'],
  'Technology':     ['CRM & Sales Pipeline', 'Project & Task Management', 'Invoicing & Billing', 'Helpdesk & Support', 'Email Automation', 'Client Portal', 'Analytics'],
  'Roofing':        ['CRM & Bid Pipeline', 'Website & SEO', 'Invoicing & Estimates', 'Email & SMS Follow-up', 'Review Management', 'Task Management', 'Inventory (Materials)', 'Analytics'],
  'HVAC':           ['Website & SEO', 'CRM & Job Pipeline', 'Online Booking', 'Invoicing & Billing', 'Email & SMS Reminders', 'Review Management', 'Inventory (Parts)', 'Analytics'],
  'Plumbing':       ['Website & SEO', 'CRM & Job Pipeline', 'Online Booking', 'Invoicing & Billing', 'Email & SMS Reminders', 'Review Management', 'Task Management', 'Analytics'],
  'Electrical':     ['Website & SEO', 'CRM & Job Pipeline', 'Online Booking', 'Invoicing & Billing', 'Email & SMS Reminders', 'Review Management', 'Task Management', 'Analytics'],
  'Landscaping':    ['Website & SEO', 'CRM & Job Pipeline', 'Online Booking', 'Recurring Billing', 'Email & SMS Automation', 'Review Management', 'Inventory (Supplies)', 'Analytics'],
  'Cleaning':       ['Website & SEO', 'CRM & Job Pipeline', 'Online Booking', 'Recurring Billing', 'Email & SMS Reminders', 'Review Management', 'Task Management', 'Analytics'],
  'Childcare':      ['Online Enrollment / Booking', 'CRM & Family Records', 'Recurring Billing', 'Email & SMS Communication', 'Helpdesk', 'Review Management', 'Analytics'],
  'Insurance':      ['CRM & Policy Pipeline', 'Email & SMS Drip', 'Online Booking', 'Billing & Renewals', 'Task & Follow-up Management', 'Client Portal', 'Analytics'],
  'Auto Repair':    ['Online Booking', 'CRM & Service History', 'Invoicing & Billing', 'Email & SMS Reminders', 'Review Management', 'Inventory (Parts)', 'Task Management', 'Analytics'],
  'Retail':         ['Website & SEO', 'CRM & Loyalty', 'Email & SMS Marketing', 'Social Media', 'Inventory Management', 'Invoicing & POS', 'Review Management', 'Analytics'],
  'Flooring':       ['Website & SEO', 'CRM & Job Pipeline', 'Invoicing & Estimates', 'Email & SMS Follow-up', 'Review Management', 'Inventory (Materials)', 'Task Management', 'Analytics'],
  'Pest Control':   ['Website & SEO', 'CRM & Job Pipeline', 'Online Booking', 'Recurring Billing', 'Email & SMS Reminders', 'Review Management', 'Task Management', 'Analytics'],
  'Pool / Spa':     ['CRM & Service Pipeline', 'Online Booking', 'Recurring Billing', 'Email & SMS Reminders', 'Review Management', 'Inventory (Chemicals)', 'Task Management', 'Analytics'],
  'Photography':    ['Online Booking', 'CRM & Client Portal', 'Invoicing & Contracts', 'Email Automation', 'Social Media', 'Review Management', 'Task Management', 'Analytics'],
  'Accounting':     ['CRM & Client Pipeline', 'Billing & Retainers', 'Task & Deadline Management', 'Email Automation', 'Client Portal', 'Helpdesk', 'Analytics'],
};

function getModules(industry: string): string[] {
  return INDUSTRY_MODULES[industry] ?? ['Website & SEO', 'CRM & Pipeline', 'Email & SMS Automation', 'Invoicing & Billing', 'Review Management', 'Task Management', 'Analytics'];
}

function buildBrief(fields: {
  bizName: string;
  industry: string;
  contactName: string;
  city: string;
  revenue: string;
  painPoints: string[];
}): string {
  const modules = getModules(fields.industry);
  const pains = fields.painPoints
    .map((id) => PAIN_POINTS.find((p) => p.id === id)?.label)
    .filter(Boolean)
    .join(', ');

  return [
    `Demo Brief — ${fields.bizName || '[Business Name]'}`,
    `Industry: ${fields.industry}`,
    `Contact: ${fields.contactName || '[Name]'}`,
    `City: ${fields.city || '[City]'}`,
    `Est. Monthly Revenue: ${fields.revenue}`,
    `Pain Points: ${pains || 'None selected'}`,
    `Modules to Demo: ${modules.join(', ')}`,
    '',
    'Generated by MAX EV Admin',
  ].join('\n');
}

export default function DemoCustomizePage() {
  const [bizName, setBizName]         = useState('');
  const [industry, setIndustry]       = useState('Home Services');
  const [contactName, setContactName] = useState('');
  const [city, setCity]               = useState('');
  const [revenue, setRevenue]         = useState(REVENUE_OPTIONS[0]);
  const [painPoints, setPainPoints]   = useState<string[]>([]);
  const [copied, setCopied]           = useState(false);

  function togglePain(id: string) {
    setPainPoints((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function copyBrief() {
    const text = buildBrief({ bizName, industry, contactName, city, revenue, painPoints });
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const modules = getModules(industry);
  const hasName = bizName.trim().length > 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Demo Customizer</h1>
          <p className="page-sub">Fill in prospect details before your demo so everything feels personal</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={copyBrief}
            disabled={!hasName}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy Brief'}
          </button>
          <Link href="/demo-center" className="btn btn-primary btn-sm">
            <ExternalLink size={13} />
            Launch Demo
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

        {/* Left — Prospect Info */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sliders size={15} style={{ color: 'var(--primary)' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--white)' }}>Prospect Info</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
            <div>
              <label className="label">Business Name</label>
              <input
                className="input"
                placeholder="e.g. Plano Italian Bistro"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Industry</label>
              <select
                className="input"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Contact Name</label>
              <input
                className="input"
                placeholder="e.g. John Smith"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div>
              <label className="label">City</label>
              <input
                className="input"
                placeholder="e.g. Plano"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Estimated Monthly Revenue</label>
              <select
                className="input"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
              >
                {REVENUE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label" style={{ marginBottom: 12, display: 'block' }}>Current Pain Points</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {PAIN_POINTS.map((p) => (
                <label
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: painPoints.includes(p.id) ? 'rgba(37,99,235,0.12)' : 'var(--card2)',
                    border: `1px solid ${painPoints.includes(p.id) ? 'rgba(37,99,235,0.4)' : 'var(--border)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={painPoints.includes(p.id)}
                    onChange={() => togglePain(p.id)}
                    style={{ accentColor: 'var(--primary)', width: 15, height: 15, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.82rem', color: painPoints.includes(p.id) ? 'var(--white)' : 'var(--light)', fontWeight: painPoints.includes(p.id) ? 600 : 400 }}>
                    {p.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Demo Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {hasName ? (
            <div className="card-blue" style={{ padding: 24 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Demo Preview
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--white)', fontFamily: 'var(--font-display)', marginBottom: 4 }}>
                {bizName}
              </div>
              <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>
                {industry}{city ? ` — ${city}` : ''}{contactName ? ` | ${contactName}` : ''}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: '14px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                    Modules to Show
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {modules.map((m) => (
                      <span key={m} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{m}</span>
                    ))}
                  </div>
                </div>

                {painPoints.length > 0 && (
                  <div style={{ padding: '14px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                      Pain Points to Address
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {painPoints.map((id) => {
                        const p = PAIN_POINTS.find((x) => x.id === id);
                        return p ? (
                          <span key={id} className="badge badge-orange" style={{ fontSize: '0.7rem' }}>{p.label}</span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div style={{ padding: '14px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                    Est. Revenue
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--white)', fontWeight: 600 }}>{revenue}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 24, textAlign: 'center', border: '2px dashed var(--border)' }}>
              <Eye size={28} style={{ color: 'var(--gray)', margin: '0 auto 10px' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--gray)', fontWeight: 600, marginBottom: 4 }}>Demo Preview</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>Enter a business name to see the live preview</div>
            </div>
          )}

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link
                href="/demo-center"
                className="btn btn-primary"
                style={{ justifyContent: 'center', width: '100%' }}
              >
                <ExternalLink size={14} />
                Launch Demo
              </Link>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ justifyContent: 'center', width: '100%' }}
                onClick={copyBrief}
                disabled={!hasName}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Brief Copied!' : 'Copy Brief'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
