'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Zap, Monitor, DollarSign, Phone } from 'lucide-react';

const INDUSTRY_PLACEHOLDER = 'Your Industry';

const TOOL_REPLACEMENTS = [
  { from: 'HubSpot',     to: 'MAX CRM',        color: '#EF4444' },
  { from: 'QuickBooks',  to: 'MAX Accounting',  color: '#22C55E' },
  { from: 'Calendly',    to: 'MAX Booking',     color: '#3B82F6' },
  { from: 'Mailchimp',   to: 'MAX Email',       color: '#F59E0B' },
  { from: 'Zendesk',     to: 'MAX Support',     color: '#8B5CF6' },
  { from: 'Excel',       to: 'MAX Ops',         color: '#06B6D4' },
];

const PRICING = [
  {
    name: 'Starter',
    price: '$650',
    color: '#3B82F6',
    bullets: [
      'Professional website + mobile optimized',
      'Google Business Profile setup & optimization',
      'Local SEO + basic review management',
    ],
  },
  {
    name: 'Growth',
    price: '$1,200',
    color: '#22C55E',
    highlight: true,
    bullets: [
      'Everything in Starter, plus:',
      'CRM + automated email sequences',
      'Online booking + social media management',
    ],
  },
  {
    name: 'Pro',
    price: '$2,800',
    color: '#E55A2B',
    bullets: [
      'Everything in Growth, plus:',
      'Paid ads management (Google + Meta)',
      'Advanced automation + monthly reporting',
    ],
  },
];

type SlideKey = 'problem' | 'solution' | 'demo' | 'offer';

const SLIDE_KEYS: SlideKey[] = ['problem', 'solution', 'demo', 'offer'];

export default function PitchDeckPage() {
  const [slide, setSlide] = useState(0);
  const total = SLIDE_KEYS.length;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setSlide((s) => Math.min(s + 1, total - 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setSlide((s) => Math.max(s - 1, 0));
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [total]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Demo Pitch</h1>
          <p className="page-sub">4-slide live pitch deck — use arrow keys or buttons to navigate</p>
        </div>
      </div>

      {/* Slide area */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--card2)' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Slide {slide + 1} of {total}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSlide((s) => Math.max(s - 1, 0))}
              disabled={slide === 0}
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setSlide((s) => Math.min(s + 1, total - 1))}
              disabled={slide === total - 1}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Slide content */}
        <div style={{ minHeight: 480, padding: '40px 48px' }}>
          {slide === 0 && <SlideOne />}
          {slide === 1 && <SlideTwo />}
          {slide === 2 && <SlideThree />}
          {slide === 3 && <SlideFour />}
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {SLIDE_KEYS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSlide(i)}
            style={{
              width: i === slide ? 28 : 10,
              height: 10,
              borderRadius: 5,
              background: i === slide ? 'var(--primary)' : 'var(--border)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              padding: 0,
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ---------- Slide 1: The Problem ---------- */
function SlideOne() {
  const stats = [
    { label: 'No website', value: '43%', sub: 'of local businesses' },
    { label: 'No Google reviews', value: '61%', sub: 'never claimed their profile' },
    { label: 'Manual invoicing', value: '78%', sub: 'still using paper/spreadsheets' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AlertTriangle size={24} style={{ color: '#EF4444' }} />
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Slide 1 — The Problem</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--white)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            Your Business is Bleeding Revenue Online
          </h2>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
        {[
          '70% of local businesses have an outdated or invisible web presence',
          'The average small business pays $800+/mo across 6 disconnected SaaS tools',
          'Your competitors are booking customers while you\'re playing phone tag',
        ].map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', flexShrink: 0, marginTop: 7 }} />
            <span style={{ fontSize: '1.05rem', color: 'var(--light)', lineHeight: 1.5 }}>{b}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: '20px 22px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#EF4444', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--white)', margin: '6px 0 3px' }}>{s.label}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Slide 2: The Solution ---------- */
function SlideTwo() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={24} style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Slide 2 — The Solution</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--white)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            One Platform. Everything Connected.
          </h2>
        </div>
      </div>

      <p style={{ fontSize: '1rem', color: 'var(--gray)', marginBottom: 32, marginLeft: 66 }}>
        MAX EV Digital replaces 6 tools with 1 clean dashboard
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {TOOL_REPLACEMENTS.map((t) => (
          <div key={t.from} style={{ padding: '18px 20px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--gray)', textDecoration: 'line-through' }}>{t.from}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--gray)' }}>→</span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: t.color }}>{t.to}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Slide 3: The Demo ---------- */
function SlideThree() {
  const cards = [
    {
      title: 'Website + SEO',
      desc: 'A fast, modern site built for your city and your service. Ranks on Google in 30 days.',
      icon: Monitor,
    },
    {
      title: 'Admin Dashboard',
      desc: 'See every lead, job, invoice, and client conversation in one view — from any device.',
      icon: Zap,
    },
    {
      title: 'Marketing Automation',
      desc: 'Automated follow-ups, review requests, and email campaigns — running 24/7 without you.',
      icon: AlertTriangle,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(0,212,200,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Monitor size={24} style={{ color: 'var(--green)' }} />
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Slide 3 — The Demo</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--white)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            See It Live — Built for {INDUSTRY_PLACEHOLDER}
          </h2>
        </div>
      </div>

      <p style={{ fontSize: '1rem', color: 'var(--gray)', marginBottom: 32, marginLeft: 66 }}>
        This is a real working system, not a mockup
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} style={{ padding: '22px 22px', background: 'rgba(0,212,200,0.05)', border: '1px solid rgba(0,212,200,0.2)', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Icon size={20} style={{ color: 'var(--green)' }} />
                <span className="badge badge-green" style={{ fontSize: '0.66rem' }}>Live</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 8 }}>{c.title}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--light)', lineHeight: 1.55 }}>{c.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Slide 4: The Offer ---------- */
function SlideFour() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(229,90,43,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <DollarSign size={24} style={{ color: 'var(--orange)' }} />
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Slide 4 — The Offer</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--white)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            Get Started This Week
          </h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {PRICING.map((p) => (
          <div
            key={p.name}
            style={{
              padding: '24px 22px',
              background: p.highlight ? `rgba(34,197,94,0.07)` : 'var(--card2)',
              border: `1px solid ${p.highlight ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
              borderRadius: 12,
              position: 'relative',
            }}
          >
            {p.highlight && (
              <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)' }}>
                <span className="badge badge-green" style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>Most Popular</span>
              </div>
            )}
            <div style={{ fontSize: '1rem', fontWeight: 700, color: p.color, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--white)', fontFamily: 'var(--font-display)', marginBottom: 16 }}>
              {p.price}<span style={{ fontSize: '0.9rem', color: 'var(--gray)', fontWeight: 500 }}>/mo</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.bullets.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: p.color, flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--light)', lineHeight: 1.4 }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button type="button" className="btn btn-primary" style={{ padding: '12px 32px', fontSize: '0.95rem' }}>
          <Phone size={16} />
          Book Your Kickoff Call
        </button>
      </div>
    </div>
  );
}
