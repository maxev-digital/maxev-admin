'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Monitor, Layers, Globe, BarChart2, Calendar, CreditCard, Mail, Headphones, CheckSquare, PieChart, Box, Star } from 'lucide-react';

const LIVE_INDUSTRIES = new Set([
  'Home Services', 'Restaurant', 'Dental', 'Legal', 'Real Estate',
  'Automotive', 'Healthcare', 'Fitness', 'Beauty', 'Technology', 'Roofing',
]);

// Industries with a fully-built present mode slide deck
const PRESENT_SLUGS: Record<string, string> = {
  'Dental': 'dental',
  'Restaurant': 'restaurant',
  'Roofing': 'roofing',
  'Legal': 'legal',
};

const ALL_INDUSTRIES = [
  'Home Services', 'Restaurant', 'Dental', 'Legal', 'Real Estate', 'Automotive',
  'Healthcare', 'Fitness', 'Beauty', 'Technology', 'Roofing', 'HVAC', 'Plumbing',
  'Electrical', 'Landscaping', 'Cleaning', 'Childcare', 'Education', 'Finance',
  'Retail', 'Pet Services', 'Photography', 'Event Planning', 'Accounting', 'Insurance',
];

type SaasModule = {
  priority: number;
  name: string;
  tagline: string;
  replaces: string[];
  status: 'live' | 'in-dev' | 'planned';
  icon: React.ReactNode;
  flagship?: boolean;
  href: string;
  highlights: string[];
};

const SAAS_MODULES: SaasModule[] = [
  {
    priority: 1,
    name: 'CRM + Lead Management',
    tagline: 'Track every lead, deal, and follow-up in one place.',
    replaces: ['Salesforce', 'HubSpot', 'Zoho CRM'],
    status: 'live',
    icon: <BarChart2 size={18} />,
    href: '/clients',
    highlights: ['8-stage Kanban pipeline', 'Full client CRUD + history', 'Proposal builder', 'DFW lead queue (45k records)'],
  },
  {
    priority: 2,
    name: 'Inventory & Operations',
    tagline: 'Replace spreadsheets with live stock, orders, and supply tracking.',
    replaces: ['Excel / Google Sheets', 'Fishbowl', 'QuickBooks Inventory'],
    status: 'live',
    icon: <Box size={18} />,
    href: '/inventory',
    highlights: ['Live stock dashboard', 'Inline product editor', 'Purchase orders', 'AI reorder suggestions'],
  },
  {
    priority: 3,
    name: 'Accounting & Invoicing',
    tagline: 'Send invoices, track expenses, and close the books — no accountant required.',
    replaces: ['QuickBooks Online', 'Xero', 'FreshBooks', 'Sage'],
    status: 'live',
    icon: <PieChart size={18} />,
    href: '/finance/reports',
    highlights: ['Invoice + deposit/retainer types', 'Monthly P&L reports', 'Expense log', 'Package revenue analysis'],
  },
  {
    priority: 4,
    name: 'Booking & Scheduling',
    tagline: 'Let customers book appointments 24/7 without phone tag.',
    replaces: ['Calendly', 'Acuity', 'Square Appointments', 'Mindbody'],
    status: 'live',
    icon: <Calendar size={18} />,
    href: '/booking',
    highlights: ['Week calendar view', 'Multi-staff scheduling', 'AI no-show risk scoring', 'Services + availability grid'],
  },
  {
    priority: 5,
    name: 'Billing & Payments',
    tagline: 'Auto-charge cards, send receipts, and track recurring revenue.',
    replaces: ['Stripe + spreadsheets', 'QuickBooks Billing', 'Chargify'],
    status: 'live',
    icon: <CreditCard size={18} />,
    href: '/finance/payments',
    highlights: ['Stripe + ACH + Zelle tracking', 'Retainer + project payments', 'AI collections alerts', 'Subscription overview'],
  },
  {
    priority: 6,
    name: 'Marketing Automation',
    tagline: 'Email + SMS sequences that nurture leads while you sleep.',
    replaces: ['HubSpot', 'Mailchimp', 'Klaviyo', 'ActiveCampaign'],
    status: 'live',
    icon: <Mail size={18} />,
    href: '/outreach',
    highlights: ['Email campaigns + templates', 'SMS inbox (Twilio)', 'Automation workflows', 'Newsletter studio'],
  },
  {
    priority: 7,
    name: 'Customer Support / Helpdesk',
    tagline: 'One inbox for every customer message — with AI that drafts replies.',
    replaces: ['Zendesk', 'Freshdesk', 'Help Scout'],
    status: 'live',
    icon: <Headphones size={18} />,
    href: '/helpdesk',
    highlights: ['Unified ticket inbox', 'AI draft reply (Claude Haiku)', 'Priority scoring P1/P2/P3', 'Canned response macros'],
  },
  {
    priority: 8,
    name: 'Project & Task Management',
    tagline: 'Assign tasks, track jobs, and hit deadlines without the chaos.',
    replaces: ['Asana', 'Trello', 'Monday.com', 'ClickUp'],
    status: 'live',
    icon: <CheckSquare size={18} />,
    href: '/tasks',
    highlights: ['4-column Kanban board', 'Priority + due date tracking', 'Client-linked tasks', 'AI daily briefing'],
  },
  {
    priority: 9,
    name: 'Reporting & Analytics',
    tagline: 'Live revenue, lead, and ops intelligence in one screen.',
    replaces: ['Google Analytics + Excel', 'Looker Studio', 'Databox'],
    status: 'live',
    icon: <Globe size={18} />,
    href: '/analytics',
    highlights: ['Live MRR + pipeline KPIs', 'Revenue by client + package', 'AI weekly priorities', 'Stage conversion funnel'],
  },
  {
    priority: 10,
    name: 'Full Business OS',
    tagline: 'Every module unified — the complete replacement for legacy enterprise software.',
    replaces: ['Odoo', 'NetSuite', 'Microsoft Dynamics', 'SAP Business One'],
    status: 'in-dev',
    icon: <Layers size={18} />,
    flagship: true,
    href: '/dashboard',
    highlights: ['All 9 modules in one platform', 'Multi-tenant per client', 'White-label branding', 'AI across every workflow'],
  },
];

const statusConfig: Record<string, { label: string; badge: string }> = {
  live:     { label: 'Live Demo',  badge: 'badge-green' },
  'in-dev': { label: 'In Dev',     badge: 'badge-blue'  },
  planned:  { label: 'Planned',    badge: 'badge-gray'  },
};

type Tab = 'modules' | 'industries';

export default function DemoCenterPage() {
  const [tab, setTab] = useState<Tab>('modules');

  const liveCount    = SAAS_MODULES.filter((m) => m.status === 'live').length;
  const inDevCount   = SAAS_MODULES.filter((m) => m.status === 'in-dev').length;
  const plannedCount = SAAS_MODULES.filter((m) => m.status === 'planned').length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Demo Center</h1>
          <p className="page-sub">Full SaaS platform — 10 modules replacing legacy software</p>
        </div>
        <a href="/demo-center/present" className="btn btn-primary btn-sm">
          <Monitor size={13} />
          Present Mode
        </a>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div className="kpi-value-green">{liveCount}</div>
            <Star size={16} style={{ color: 'var(--green)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">Live Demos</div>
        </div>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div className="kpi-value">{inDevCount}</div>
            <Layers size={16} style={{ color: 'var(--primary)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">In Development</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div className="kpi-value" style={{ color: 'var(--gray)' }}>{plannedCount}</div>
            <Layers size={16} style={{ color: 'var(--gray)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">Planned</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'modules' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('modules')}
        >
          <Layers size={12} />
          SaaS Modules
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'industries' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('industries')}
        >
          <Globe size={12} />
          Industry Demos
        </button>
      </div>

      {tab === 'modules' && (
        <>
          <div style={{ marginBottom: 16, fontSize: '0.8rem', color: 'var(--gray)', lineHeight: 1.6 }}>
            10 SaaS modules built to replace the most expensive legacy tools small businesses overpay for.
            Each module can be sold standalone or as part of the{' '}
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>MAX EV Business OS</span>.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SAAS_MODULES.map((mod) => {
              const sc = statusConfig[mod.status];
              return (
                <div
                  key={mod.priority}
                  className="card"
                  style={{
                    padding: '18px 20px',
                    border: mod.flagship ? '1px solid rgba(37,99,235,0.5)' : undefined,
                    background: mod.flagship ? 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, var(--card) 60%)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    {/* Priority number */}
                    <div style={{
                      minWidth: 32, height: 32, borderRadius: 8,
                      background: mod.flagship ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 800,
                      color: mod.flagship ? 'var(--primary)' : 'var(--gray)',
                      flexShrink: 0,
                    }}>
                      {mod.priority === 10 ? (
                        <span style={{ fontSize: '0.65rem' }}>★</span>
                      ) : `#${mod.priority}`}
                    </div>

                    {/* Icon + Name + Tagline + Highlights */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ color: mod.flagship ? 'var(--primary)' : 'var(--light)', display: 'flex' }}>
                          {mod.icon}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--white)' }}>
                          {mod.name}
                        </span>
                        {mod.flagship && (
                          <span className="badge badge-blue" style={{ fontSize: '0.62rem' }}>Flagship</span>
                        )}
                        <span className={`badge ${sc.badge}`} style={{ fontSize: '0.62rem' }}>{sc.label}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 10 }}>
                        {mod.tagline}
                      </div>

                      {/* Highlights */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        {mod.highlights.map((h) => (
                          <span
                            key={h}
                            style={{
                              fontSize: '0.68rem', padding: '2px 8px',
                              background: 'rgba(0,212,200,0.06)',
                              border: '1px solid rgba(0,212,200,0.15)',
                              borderRadius: 10, color: 'var(--green)',
                            }}
                          >
                            {h}
                          </span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--gray)', fontWeight: 600, marginRight: 2 }}>Replaces:</span>
                        {mod.replaces.map((r) => (
                          <span
                            key={r}
                            style={{
                              fontSize: '0.68rem', padding: '2px 8px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid var(--border)',
                              borderRadius: 10, color: 'var(--light)',
                            }}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action */}
                    <Link
                      href={mod.href}
                      className="btn btn-ghost btn-sm"
                      style={{
                        flexShrink: 0,
                        fontSize: '0.72rem',
                        opacity: mod.status === 'planned' ? 0.4 : 1,
                        pointerEvents: mod.status === 'planned' ? 'none' : 'auto',
                      }}
                    >
                      <ExternalLink size={12} />
                      {mod.status === 'planned' ? 'Coming Soon' : 'Open Demo'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'industries' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {ALL_INDUSTRIES.map((industry) => {
            const isLive = LIVE_INDUSTRIES.has(industry);
            return (
              <div key={industry} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--white)' }}>{industry}</span>
                  <span className={`badge ${isLive ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                    {isLive ? 'Live' : 'Coming Soon'}
                  </span>
                </div>
                {PRESENT_SLUGS[industry] ? (
                  <Link
                    href={`/demo-center/present?industry=${PRESENT_SLUGS[industry]}`}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <ExternalLink size={12} />
                    Launch Deck
                  </Link>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)', textAlign: 'center', padding: '6px 0' }}>
                    Deck coming soon
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
