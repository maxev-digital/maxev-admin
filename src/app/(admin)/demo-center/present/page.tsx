'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, X, Sparkles, Brain, Zap,
  Users, Package, Calendar, Receipt, Mail, Headphones,
  CheckSquare, BarChart2, Layers, TrendingUp, Shield,
  Clock, DollarSign, AlertTriangle, Star,
} from 'lucide-react';

// ─── Industry config ──────────────────────────────────────────────────────────

type Industry = 'dental' | 'restaurant' | 'roofing' | 'legal';

type IndustryConfig = {
  label: string;
  color: string;
  accent: string;
  role: string;
  tagline: string;
  painPoints: string[];
  competitors: { name: string; cost: string; problem: string }[];
  totalWaste: string;
  kpis: { label: string; value: string; sub: string }[];
  aiFeatures: { title: string; desc: string; model: string }[];
  moduleSpotlight: {
    name: string;
    icon: React.ReactNode;
    stats: { label: string; value: string }[];
    aiInsight: string;
  };
  roi: { line: string; saving: string }[];
};

const INDUSTRIES: Record<Industry, IndustryConfig> = {
  dental: {
    label: 'Dental Practice',
    color: '#2563EB',
    accent: '#93C5FD',
    role: 'Practice Owner',
    tagline: 'Run your entire practice from one screen — patients, billing, inventory, and staff.',
    painPoints: [
      'No-shows cost $180 per empty chair',
      'Insurance pre-auth takes 2 hrs/day manually',
      'Patient follow-up falls through the cracks',
      'Supplies ordered late → procedures delayed',
    ],
    competitors: [
      { name: 'Dentrix / Eaglesoft', cost: '$400/mo', problem: 'Clunky, no mobile, 1990s UI' },
      { name: 'Weave (phones)', cost: '$500/mo', problem: 'Just communications, nothing else' },
      { name: 'QuickBooks', cost: '$85/mo', problem: 'No practice context, manual data entry' },
      { name: 'Patterson Ordering', cost: '$0 + markups', problem: 'Locked into one supplier' },
    ],
    totalWaste: '$11,820/yr',
    kpis: [
      { label: 'Patients / Day', value: '22', sub: 'avg 2 providers' },
      { label: 'Chair Utilization', value: '74%', sub: 'industry avg 68%' },
      { label: 'Avg Revenue / Patient', value: '$485', sub: 'incl. hygiene' },
    ],
    aiFeatures: [
      { title: 'No-Show Prediction', desc: 'Flags high-risk appointments 48hrs out. Auto-sends reminder + fills from waitlist.', model: 'Claude Sonnet' },
      { title: 'Insurance Pre-Auth', desc: 'Drafts pre-authorization requests based on treatment plan. Cuts admin time 80%.', model: 'Claude Haiku' },
      { title: 'Reorder Intelligence', desc: 'Tracks supply consumption by procedure volume. Orders before you run out.', model: 'Claude Sonnet' },
    ],
    moduleSpotlight: {
      name: 'Booking & Scheduling',
      icon: <Calendar size={20} />,
      stats: [
        { label: 'Appointments This Week', value: '87' },
        { label: 'Open Slots', value: '3' },
        { label: 'High No-Show Risk', value: '2' },
        { label: 'Waitlist', value: '4 patients' },
      ],
      aiInsight: 'Michael Torres (Tue 8:30am) — last-minute booking pattern. AI recommends sending a reminder 24hrs out to reduce no-show probability by 63%.',
    },
    roi: [
      { line: 'Replace Dentrix / Eaglesoft', saving: '$400/mo' },
      { line: 'Replace Weave', saving: '$500/mo' },
      { line: 'Replace QuickBooks', saving: '$85/mo' },
      { line: 'Recover 1 no-show/week avg', saving: '$720/mo' },
      { line: 'Admin time saved (2 hrs/day)', saving: '$1,200/mo' },
    ],
  },

  restaurant: {
    label: 'Restaurant',
    color: '#D97706',
    accent: '#FCD34D',
    role: 'Owner / Operator',
    tagline: 'One system for reservations, staff, inventory, and loyal customers — nothing falls through.',
    painPoints: [
      'OpenTable takes $1–4 per cover in fees',
      'Food waste averages 15% of food cost',
      'No visibility into repeat customers or LTV',
      'Staff scheduling is a WhatsApp group nightmare',
    ],
    competitors: [
      { name: 'Toast POS', cost: '$165/mo', problem: 'POS only, no CRM or scheduling' },
      { name: 'OpenTable', cost: '$249/mo + fees', problem: 'Per-cover fees add up fast' },
      { name: '7shifts (scheduling)', cost: '$135/mo', problem: 'Staff only, no inventory link' },
      { name: 'QuickBooks', cost: '$85/mo', problem: 'No restaurant context whatsoever' },
    ],
    totalWaste: '$7,848/yr',
    kpis: [
      { label: 'Covers / Weekend', value: '185', sub: 'Fri–Sun' },
      { label: 'Avg Check', value: '$42', sub: 'excl. private events' },
      { label: 'Table Turns / Night', value: '3.2', sub: 'target 3.5' },
    ],
    aiFeatures: [
      { title: 'Demand Forecasting', desc: 'Predicts covers for the next 7 days based on history, weather, and local events. Cuts over-ordering 40%.', model: 'Claude Sonnet' },
      { title: 'Loyalty Recognition', desc: 'Flags returning customers at booking. Suggests comped item or server note to drive retention.', model: 'Claude Haiku' },
      { title: 'Labor Optimizer', desc: 'Recommends staffing levels per shift based on forecasted covers. Saves 3–4 labor hours/week.', model: 'Claude Sonnet' },
    ],
    moduleSpotlight: {
      name: 'Inventory & Ops',
      icon: <Package size={20} />,
      stats: [
        { label: 'SKUs Tracked', value: '148' },
        { label: 'Below Par Level', value: '6 items' },
        { label: 'Waste This Week', value: '$340' },
        { label: 'AI Reorder Queue', value: '4 pending' },
      ],
      aiInsight: 'Saturday is projected at 210 covers (+14% vs. avg). AI recommends adding 8 lbs salmon and 4 cases craft beer to Thursday\'s order to avoid 86\'ing on peak night.',
    },
    roi: [
      { line: 'Replace OpenTable', saving: '$249/mo + fees' },
      { line: 'Replace 7shifts', saving: '$135/mo' },
      { line: 'Replace QuickBooks', saving: '$85/mo' },
      { line: 'Reduce food waste 5%', saving: '$600/mo' },
      { line: 'Recover 3 labor hrs/week', saving: '$390/mo' },
    ],
  },

  roofing: {
    label: 'Roofing / Home Services',
    color: '#059669',
    accent: '#6EE7B7',
    role: 'Owner / Sales Manager',
    tagline: 'Stop losing bids in your inbox. Track every lead, job, and crew from one dashboard.',
    painPoints: [
      'Estimates sent and never followed up — 60% of bids go cold',
      'Crew scheduling runs on phone calls and texts',
      'No system to track material costs per job',
      'Storm season leads pile up with no triage process',
    ],
    competitors: [
      { name: 'JobNimbus', cost: '$350/mo', problem: 'Complex, slow, expensive training' },
      { name: 'AccuLynx', cost: '$200/mo', problem: 'Roofing-only, no general contractor use' },
      { name: 'CompanyCam', cost: '$65/mo', problem: 'Photos only, no CRM or billing' },
      { name: 'QuickBooks', cost: '$85/mo', problem: 'No job costing or field crew tools' },
    ],
    totalWaste: '$8,400/yr',
    kpis: [
      { label: 'Active Jobs', value: '12', sub: 'residential + commercial' },
      { label: 'Avg Job Value', value: '$18,500', sub: 'including materials' },
      { label: 'Bid Close Rate', value: '34%', sub: 'industry avg 28%' },
    ],
    aiFeatures: [
      { title: 'Lead Priority Scoring', desc: 'Scores storm-damage leads by urgency, neighborhood, and insurance carrier. Tells reps who to call first.', model: 'Claude Sonnet' },
      { title: 'Bid Follow-Up Sequences', desc: 'Auto-drafts follow-up emails at day 3, 7, and 14 post-estimate. Closes 22% more bids.', model: 'Claude Haiku' },
      { title: 'Material Cost Tracker', desc: 'Compares actual material costs to estimate per job. Flags margin bleed before final invoice.', model: 'Claude Sonnet' },
    ],
    moduleSpotlight: {
      name: 'Pipeline CRM',
      icon: <Users size={20} />,
      stats: [
        { label: 'Open Leads', value: '31' },
        { label: 'Estimates Sent', value: '14' },
        { label: 'Bids > 7 Days Old', value: '8' },
        { label: 'In Production', value: '12 jobs' },
      ],
      aiInsight: 'Thompson Residence (Plano) — estimate sent 9 days ago, no response. AI detects neighbor job completed this week — recommends: "Mention you just finished the house on Elm Dr. Same neighborhood, same storm damage."',
    },
    roi: [
      { line: 'Replace JobNimbus', saving: '$350/mo' },
      { line: 'Replace CompanyCam + AccuLynx', saving: '$265/mo' },
      { line: 'Close 2 more bids/month (AI follow-up)', saving: '$1,850/mo' },
      { line: 'Reduce material overages 8%', saving: '$480/mo' },
      { line: 'Admin time saved', saving: '$400/mo' },
    ],
  },

  legal: {
    label: 'Legal / Law Firm',
    color: '#7C3AED',
    accent: '#C4B5FD',
    role: 'Managing Partner',
    tagline: 'Intake, billing, deadlines, and client communication — all in one place, all billable.',
    painPoints: [
      'Intake leads sit in email for days — hot prospects go cold',
      'Time tracking is manual — 20% of billable time never gets logged',
      'Retainer replenishment is reactive, not automated',
      'Trust accounting compliance done in spreadsheets',
    ],
    competitors: [
      { name: 'Clio', cost: '$49/user/mo', problem: 'Complex, bloated, expensive at scale' },
      { name: 'MyCase', cost: '$49/user/mo', problem: 'Limited AI, no outreach automation' },
      { name: 'LexisNexis', cost: '$150/mo', problem: 'Research only, no practice management' },
      { name: 'QuickBooks', cost: '$85/mo', problem: 'No trust accounting or matter tracking' },
    ],
    totalWaste: '$10,212/yr',
    kpis: [
      { label: 'Active Matters', value: '47', sub: 'civil litigation focus' },
      { label: 'Avg Billable Rate', value: '$350/hr', sub: 'blended 5-atty firm' },
      { label: 'Collection Rate', value: '81%', sub: 'target 90%' },
    ],
    aiFeatures: [
      { title: 'Intake Triage', desc: 'Scores new inquiries by case type, urgency, and estimated value. Routes hot leads to a partner within 5 minutes.', model: 'Claude Sonnet' },
      { title: 'Client Communication Drafts', desc: 'Drafts status update emails for client-facing attorneys. Keeps clients informed without eating billable time.', model: 'Claude Haiku' },
      { title: 'Deadline Intelligence', desc: 'Reads matter notes and flags statute of limitations, filing deadlines, and court dates 30 days out.', model: 'Claude Sonnet' },
    ],
    moduleSpotlight: {
      name: 'Finance & Billing',
      icon: <Receipt size={20} />,
      stats: [
        { label: 'Outstanding Retainers', value: '$84,200' },
        { label: 'Invoices Overdue', value: '6' },
        { label: 'Avg Days to Pay', value: '18' },
        { label: 'Unbilled Time (est)', value: '$12,400' },
      ],
      aiInsight: 'Jensen & Co. retainer balance dropped below $2,500 threshold. AI drafted replenishment request: "Based on projected activity through month-end, we recommend funding an additional $5,000 to ensure uninterrupted service." Waiting for your approval to send.',
    },
    roi: [
      { line: 'Replace Clio (5 users)', saving: '$245/mo' },
      { line: 'Replace QuickBooks', saving: '$85/mo' },
      { line: 'Recover 12% unbilled time (AI tracking)', saving: '$2,100/mo' },
      { line: 'Faster intake = 1 more client/mo', saving: '$1,400/mo' },
      { line: 'Admin time saved', saving: '$600/mo' },
    ],
  },
};

// ─── Slide definitions ────────────────────────────────────────────────────────

const SLIDE_COUNT = 7;

// ─── Component ────────────────────────────────────────────────────────────────

const INDUSTRY_ORDER: Industry[] = ['dental', 'restaurant', 'roofing', 'legal'];

function PresentModeInner() {
  const searchParams = useSearchParams();
  const rawParam = searchParams.get('industry') as Industry | null;
  const initial: Industry = rawParam && rawParam in INDUSTRIES ? rawParam : 'dental';
  const [industry, setIndustry] = useState<Industry>(initial);
  const [slide, setSlide] = useState(0);
  const cfg = INDUSTRIES[industry];

  const prev = useCallback(() => setSlide((s) => Math.max(0, s - 1)), []);
  const next = useCallback(() => setSlide((s) => Math.min(SLIDE_COUNT - 1, s + 1)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  // Reset to slide 0 when industry changes
  useEffect(() => { setSlide(0); }, [industry]);

  const totalROI = cfg.roi.reduce((sum, r) => {
    const n = parseFloat(r.saving.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? sum : sum + n;
  }, 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#060C14',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        {/* Industry selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {INDUSTRY_ORDER.map((ind) => (
            <button
              key={ind}
              type="button"
              onClick={() => setIndustry(ind)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                border: `1px solid ${industry === ind ? INDUSTRIES[ind].color : 'rgba(255,255,255,0.1)'}`,
                background: industry === ind ? `${INDUSTRIES[ind].color}22` : 'transparent',
                color: industry === ind ? INDUSTRIES[ind].accent : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {INDUSTRIES[ind].label}
            </button>
          ))}
        </div>

        {/* Logo + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            MAX EV Business OS
          </span>
          <Link href="/demo-center" style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)',
          }}>
            <X size={14} />
          </Link>
        </div>
      </div>

      {/* ── Slide content ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* SLIDE 0: COVER */}
        {slide === 0 && (
          <div style={slideWrap}>
            <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 16px', borderRadius: 20, marginBottom: 28,
                background: `${cfg.color}22`, border: `1px solid ${cfg.color}55`,
              }}>
                <Sparkles size={13} style={{ color: cfg.accent }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cfg.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {cfg.label} Demo
                </span>
              </div>
              <h1 style={{ fontSize: '3.2rem', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 20 }}>
                {cfg.tagline}
              </h1>
              <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.45)', marginBottom: 48 }}>
                Built for {cfg.role}s who are done paying for 6 tools that don&apos;t talk to each other.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, textAlign: 'left', maxWidth: 560, margin: '0 auto' }}>
                {cfg.painPoints.map((p) => (
                  <div key={p} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '12px 16px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <AlertTriangle size={14} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 1: WHAT YOU'RE PAYING FOR */}
        {slide === 1 && (
          <div style={slideWrap}>
            <SlideHeader color={cfg.color} accent={cfg.accent} label="The Problem" />
            <h2 style={h2}>You&apos;re paying <span style={{ color: '#F87171' }}>{cfg.totalWaste}</span> for tools that don&apos;t talk to each other.</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxWidth: 760, margin: '0 auto' }}>
              {cfg.competitors.map((c) => (
                <div key={c.name} style={{
                  padding: '18px 20px', borderRadius: 12,
                  background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{c.name}</span>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#F87171' }}>{c.cost}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>{c.problem}</p>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)' }}>
                And none of them have AI. We replace all of them with one platform — starting at{' '}
                <strong style={{ color: cfg.accent }}>$299/mo</strong>.
              </span>
            </div>
          </div>
        )}

        {/* SLIDE 2: THE PLATFORM */}
        {slide === 2 && (
          <div style={slideWrap}>
            <SlideHeader color={cfg.color} accent={cfg.accent} label="The Solution" />
            <h2 style={h2}>10 modules. One login. Built for your business.</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, maxWidth: 820, margin: '0 auto' }}>
              {[
                { icon: <Users size={16} />, name: 'CRM + Pipeline' },
                { icon: <Package size={16} />, name: 'Inventory & Ops' },
                { icon: <Receipt size={16} />, name: 'Accounting' },
                { icon: <Calendar size={16} />, name: 'Booking' },
                { icon: <DollarSign size={16} />, name: 'Payments' },
                { icon: <Mail size={16} />, name: 'Marketing' },
                { icon: <Headphones size={16} />, name: 'Helpdesk' },
                { icon: <CheckSquare size={16} />, name: 'Tasks' },
                { icon: <BarChart2 size={16} />, name: 'Analytics' },
                { icon: <Layers size={16} />, name: 'Full OS', flagship: true },
              ].map((m) => (
                <div key={m.name} style={{
                  padding: '16px 12px', borderRadius: 12, textAlign: 'center',
                  background: (m as { flagship?: boolean }).flagship ? `${cfg.color}22` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${(m as { flagship?: boolean }).flagship ? cfg.color + '55' : 'rgba(255,255,255,0.08)'}`,
                }}>
                  <div style={{ color: (m as { flagship?: boolean }).flagship ? cfg.accent : 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{m.icon}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: (m as { flagship?: boolean }).flagship ? cfg.accent : 'rgba(255,255,255,0.6)' }}>{m.name}</div>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>
              Every module has AI built in — not bolted on.
            </p>
          </div>
        )}

        {/* SLIDE 3: AI */}
        {slide === 3 && (
          <div style={slideWrap}>
            <SlideHeader color={cfg.color} accent={cfg.accent} label="AI-First Platform" />
            <h2 style={h2}>
              Powered by <span style={{ color: cfg.accent }}>Claude</span> — the same AI trusted by healthcare, legal, and finance.
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 820, margin: '0 auto 32px' }}>
              {cfg.aiFeatures.map((f) => (
                <div key={f.title} style={{
                  padding: '22px 20px', borderRadius: 14,
                  background: `linear-gradient(135deg, ${cfg.color}18 0%, rgba(255,255,255,0.03) 100%)`,
                  border: `1px solid ${cfg.color}33`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${cfg.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Brain size={14} style={{ color: cfg.accent }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{f.title}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 14 }}>{f.desc}</p>
                  <span style={{
                    fontSize: '0.65rem', padding: '3px 8px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.4)', fontWeight: 600,
                  }}>
                    {f.model}
                  </span>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center',
              padding: '14px 24px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              maxWidth: 560, margin: '0 auto',
            }}>
              <Shield size={16} style={{ color: cfg.accent, flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                <strong style={{ color: '#fff' }}>Anthropic never trains on your data.</strong> Critical for HIPAA, attorney-client privilege, and financial confidentiality.
              </span>
            </div>
          </div>
        )}

        {/* SLIDE 4: MODULE SPOTLIGHT */}
        {slide === 4 && (
          <div style={slideWrap}>
            <SlideHeader color={cfg.color} accent={cfg.accent} label="Live Demo" />
            <h2 style={h2}>{cfg.moduleSpotlight.name} — live in your account right now.</h2>
            <div style={{ display: 'flex', gap: 20, maxWidth: 820, margin: '0 auto', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {cfg.moduleSpotlight.stats.map((s) => (
                    <div key={s.label} style={{
                      padding: '16px 18px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: 4 }}>{s.value}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ width: 320, flexShrink: 0 }}>
                <div style={{
                  padding: '20px', borderRadius: 14,
                  background: `linear-gradient(135deg, ${cfg.color}22 0%, rgba(255,255,255,0.04) 100%)`,
                  border: `1px solid ${cfg.color}44`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Sparkles size={14} style={{ color: cfg.accent }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Insight</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
                    {cfg.moduleSpotlight.aiInsight}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 5: YOUR NUMBERS */}
        {slide === 5 && (
          <div style={slideWrap}>
            <SlideHeader color={cfg.color} accent={cfg.accent} label="Your Numbers" />
            <h2 style={h2}>What a typical {cfg.label} looks like on this platform.</h2>
            <div style={{ display: 'flex', gap: 16, maxWidth: 820, margin: '0 auto', justifyContent: 'center', marginBottom: 32 }}>
              {cfg.kpis.map((k) => (
                <div key={k.label} style={{
                  flex: 1, padding: '28px 20px', borderRadius: 14, textAlign: 'center',
                  background: `${cfg.color}18`, border: `1px solid ${cfg.color}44`,
                }}>
                  <div style={{ fontSize: '2.8rem', fontWeight: 900, color: cfg.accent, marginBottom: 6 }}>{k.value}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{k.sub}</div>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', maxWidth: 500, margin: '0 auto' }}>
              Your dashboard is live-populated from your actual data. No manual imports. No CSV uploads.
            </p>
          </div>
        )}

        {/* SLIDE 6: ROI */}
        {slide === 6 && (
          <div style={slideWrap}>
            <SlideHeader color={cfg.color} accent={cfg.accent} label="The ROI" />
            <h2 style={h2}>Replace everything. Save more than you spend.</h2>
            <div style={{ display: 'flex', gap: 32, maxWidth: 760, margin: '0 auto', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                {cfg.roi.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>{r.line}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#34D399' }}>{r.saving}</span>
                  </div>
                ))}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 0', marginTop: 4,
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>Total Monthly Value</span>
                  <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#34D399' }}>
                    ${Math.round(totalROI).toLocaleString()}/mo
                  </span>
                </div>
              </div>
              <div style={{ width: 220, flexShrink: 0 }}>
                <div style={{
                  padding: '24px 20px', borderRadius: 14, textAlign: 'center',
                  background: `${cfg.color}22`, border: `1px solid ${cfg.color}55`,
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                    MAX EV Platform
                  </div>
                  <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#fff', marginBottom: 4 }}>$299</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>per month</div>
                  <div style={{
                    padding: '10px', borderRadius: 8,
                    background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)',
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#34D399', fontWeight: 700, marginBottom: 4 }}>You save</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34D399' }}>
                      ${Math.max(0, Math.round(totalROI - 299)).toLocaleString()}/mo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Bottom nav ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={prev}
          disabled={slide === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: slide === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
            cursor: slide === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronLeft size={14} /> Prev
        </button>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(i)}
              style={{
                width: i === slide ? 24 : 6,
                height: 6, borderRadius: 3,
                background: i === slide ? cfg.color : 'rgba(255,255,255,0.15)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                padding: 0,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          disabled={slide === SLIDE_COUNT - 1}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
            background: slide === SLIDE_COUNT - 1 ? 'rgba(255,255,255,0.06)' : cfg.color,
            border: 'none',
            color: slide === SLIDE_COUNT - 1 ? 'rgba(255,255,255,0.2)' : '#fff',
            cursor: slide === SLIDE_COUNT - 1 ? 'not-allowed' : 'pointer',
          }}
        >
          {slide === SLIDE_COUNT - 1 ? 'Done' : 'Next'} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Shared style helpers ─────────────────────────────────────────────────────

const slideWrap: React.CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  padding: '32px 48px',
  overflowY: 'auto',
};

const h2: React.CSSProperties = {
  fontSize: '1.9rem', fontWeight: 800, color: '#fff',
  textAlign: 'center', marginBottom: 32, lineHeight: 1.2,
  maxWidth: 700,
};

function SlideHeader({ color, accent, label }: { color: string; accent: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        {label}
      </span>
    </div>
  );
}

export default function PresentModePage() {
  return (
    <Suspense fallback={
      <div style={{ position: 'fixed', inset: 0, background: '#060C14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
        Loading...
      </div>
    }>
      <PresentModeInner />
    </Suspense>
  );
}
