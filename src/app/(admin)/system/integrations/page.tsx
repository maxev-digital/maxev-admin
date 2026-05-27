'use client';

import { useState, useEffect } from 'react';
import { Settings, Check, Loader2, RefreshCw } from 'lucide-react';

type LiveKey = 'stripe' | 'twilio' | 'smtp' | 'anthropic' | 'googleCalendar';

type Integration = {
  name:          string;
  description:   string;
  color:         string;
  bg:            string;
  logo:          string;
  configured:    boolean;
  comingSoon?:   boolean;
  liveAction?:   'google-calendar';
  liveStatusKey?: LiveKey;
};

type Category = {
  label: string;
  items: Integration[];
};

const CATEGORIES: Category[] = [
  {
    label: 'Payments & Billing',
    items: [
      { name: 'Stripe',       description: 'Accept cards, ACH, and manage subscriptions',                color: '#fff',    bg: '#635BFF', logo: 'S',  configured: false, liveStatusKey: 'stripe' },
      { name: 'PayPal',       description: 'PayPal checkout and invoicing for clients',                  color: '#fff',    bg: '#003087', logo: 'PP', configured: false, comingSoon: true },
      { name: 'Square',       description: 'In-person and online payments + POS',                        color: '#fff',    bg: '#3E4348', logo: '■',  configured: false, comingSoon: true },
      { name: 'QuickBooks',   description: 'Sync invoices and payments to QuickBooks',                   color: '#fff',    bg: '#2CA01C', logo: 'QB', configured: false, comingSoon: true },
      { name: 'Xero',         description: 'Accounting sync — invoices, expenses, P&L',                  color: '#fff',    bg: '#13B5EA', logo: 'x',  configured: false, comingSoon: true },
    ],
  },
  {
    label: 'Email',
    items: [
      { name: 'Hostinger SMTP',  description: '4 mailboxes: hello@, outreach@, reports@, no-reply@',    color: '#fff',    bg: '#FF6B35', logo: 'H',  configured: false, liveStatusKey: 'smtp' },
      { name: 'Mailchimp',       description: 'Email campaigns, automations, and audience segmentation', color: '#1F1F1F', bg: '#FFE01B', logo: 'MC', configured: false, comingSoon: true },
      { name: 'Brevo',           description: 'Transactional email + SMS marketing automation',          color: '#fff',    bg: '#0DC789', logo: 'B',  configured: false, comingSoon: true },
      { name: 'SendGrid',        description: 'High-volume transactional and marketing email',            color: '#fff',    bg: '#1A82E2', logo: 'SG', configured: false, comingSoon: true },
      { name: 'Klaviyo',         description: 'E-commerce email and SMS flows',                          color: '#fff',    bg: '#1B1B1B', logo: 'K',  configured: false, comingSoon: true },
      { name: 'ConvertKit',      description: 'Creator email funnels and subscriber management',         color: '#fff',    bg: '#FB6970', logo: 'ck', configured: false, comingSoon: true },
    ],
  },
  {
    label: 'SMS & Messaging',
    items: [
      { name: 'Twilio',          description: 'Two-way SMS, automated alerts, and voice calls',          color: '#fff',    bg: '#F22F46', logo: 'T',  configured: false, liveStatusKey: 'twilio' },
      { name: 'WhatsApp Business', description: 'Message clients via WhatsApp Business API',            color: '#fff',    bg: '#25D366', logo: 'W',  configured: false, comingSoon: true },
      { name: 'Slack',           description: 'Internal team notifications and alerts to Slack channels', color: '#fff',   bg: '#4A154B', logo: '#',  configured: false, comingSoon: true },
      { name: 'Zoom',            description: 'Schedule and launch video calls from the admin panel',    color: '#fff',    bg: '#2D8CFF', logo: 'Z',  configured: false, comingSoon: true },
    ],
  },
  {
    label: 'CRM & Sales',
    items: [
      { name: 'HubSpot',         description: 'Sync contacts, deals, and notes to HubSpot CRM',         color: '#fff',    bg: '#FF7A59', logo: 'HS', configured: false, comingSoon: true },
      { name: 'Salesforce',      description: 'Bi-directional sync with Salesforce leads and accounts',  color: '#fff',    bg: '#00A1E0', logo: 'SF', configured: false, comingSoon: true },
      { name: 'Pipedrive',       description: 'Push pipeline deals and activities to Pipedrive',         color: '#fff',    bg: '#1F2D3D', logo: 'PD', configured: false, comingSoon: true },
      { name: 'GoHighLevel',     description: 'Full CRM, funnel, and automation sync',                   color: '#fff',    bg: '#D9534F', logo: 'GHL',configured: false, comingSoon: true },
    ],
  },
  {
    label: 'Social Media',
    items: [
      { name: 'Google Business', description: 'Post updates and manage reviews on Google Business Profile', color: '#fff', bg: '#4285F4', logo: 'G',  configured: false, comingSoon: true },
      { name: 'Facebook',        description: 'Publish posts and manage Facebook Pages',                  color: '#fff',    bg: '#1877F2', logo: 'f',  configured: false, comingSoon: true },
      { name: 'Instagram',       description: 'Schedule posts and reels to Instagram Business',           color: '#fff',    bg: '#C13584', logo: 'IG', configured: false, comingSoon: true },
      { name: 'LinkedIn',        description: 'Post company updates and sync employee profiles',          color: '#fff',    bg: '#0A66C2', logo: 'in', configured: false, comingSoon: true },
      { name: 'TikTok',          description: 'Schedule TikTok content and track performance',            color: '#fff',    bg: '#010101', logo: 'TT', configured: false, comingSoon: true },
      { name: 'YouTube',         description: 'Manage YouTube channel and schedule video uploads',        color: '#fff',    bg: '#FF0000', logo: 'YT', configured: false, comingSoon: true },
      { name: 'X / Twitter',     description: 'Post to X and monitor brand mentions',                    color: '#fff',    bg: '#14171A', logo: 'X',  configured: false, comingSoon: true },
    ],
  },
  {
    label: 'Advertising',
    items: [
      { name: 'Google Ads',      description: 'Link ad spend, campaigns, and conversion data',           color: '#fff',    bg: '#4285F4', logo: 'GA', configured: false, comingSoon: true },
      { name: 'Meta Ads',        description: 'Facebook and Instagram ad performance in one view',        color: '#fff',    bg: '#1877F2', logo: 'M',  configured: false, comingSoon: true },
      { name: 'Microsoft Ads',   description: 'Bing / Microsoft ad campaigns and spend tracking',        color: '#fff',    bg: '#00A4EF', logo: 'MS', configured: false, comingSoon: true },
    ],
  },
  {
    label: 'Scheduling & Calendar',
    items: [
      { name: 'Google Calendar', description: 'Two-way sync bookings and demos with Google Calendar — events auto-created on appointment booking', color: '#fff', bg: '#4285F4', logo: 'GC', configured: false, liveAction: 'google-calendar' },
      { name: 'Calendly',        description: 'Auto-create CRM leads from Calendly bookings',            color: '#fff',    bg: '#0069FF', logo: 'CL', configured: false, comingSoon: true },
      { name: 'Acuity Scheduling', description: 'Sync Acuity appointments and client records',           color: '#fff',    bg: '#FF6900', logo: 'AS', configured: false, comingSoon: true },
    ],
  },
  {
    label: 'Analytics & Reporting',
    items: [
      { name: 'Google Analytics', description: 'Track web traffic, conversions, and goal completions',   color: '#fff',    bg: '#E8710A', logo: 'GA', configured: false },
      { name: 'Google Search Console', description: 'SEO performance — impressions, clicks, rankings',   color: '#fff',    bg: '#34A853', logo: 'SC', configured: false, comingSoon: true },
      { name: 'Hotjar',           description: 'Heatmaps, session recordings, and user feedback',         color: '#fff',    bg: '#FF3C00', logo: 'HJ', configured: false, comingSoon: true },
      { name: 'Mixpanel',         description: 'Product analytics — funnels, retention, user journeys',   color: '#fff',    bg: '#7856FF', logo: 'MP', configured: false, comingSoon: true },
    ],
  },
  {
    label: 'E-Commerce',
    items: [
      { name: 'Shopify',         description: 'Sync orders, products, and customers from Shopify',       color: '#fff',    bg: '#96BF48', logo: 'SH', configured: false, comingSoon: true },
      { name: 'WooCommerce',     description: 'Pull WordPress WooCommerce orders into the CRM',          color: '#fff',    bg: '#96588A', logo: 'WC', configured: false, comingSoon: true },
      { name: 'Square POS',      description: 'In-store sales, inventory, and customer data',            color: '#fff',    bg: '#3E4348', logo: 'SQ', configured: false, comingSoon: true },
      { name: 'Clover',          description: 'Clover POS transactions and loyalty programs',            color: '#fff',    bg: '#1DA462', logo: 'CL', configured: false, comingSoon: true },
    ],
  },
  {
    label: 'AI & Automation',
    items: [
      { name: 'Anthropic',       description: 'Claude AI for insights, content generation, and Q&A',     color: '#fff',    bg: '#CC785C', logo: 'A',  configured: true },
      { name: 'OpenAI',          description: 'GPT-4 for AI writing, chat, and content tasks',           color: '#fff',    bg: '#10A37F', logo: 'AI', configured: false, comingSoon: true },
      { name: 'Zapier',          description: 'Connect to 5,000+ apps with no-code Zaps',               color: '#fff',    bg: '#FF4A00', logo: 'Z',  configured: false },
      { name: 'Make',            description: 'Advanced multi-step automation scenarios',                 color: '#fff',    bg: '#6D00CC', logo: 'M',  configured: false, comingSoon: true },
      { name: 'n8n',             description: 'Self-hosted workflow automation with full control',        color: '#fff',    bg: '#EF4444', logo: 'n8', configured: false, comingSoon: true },
    ],
  },
  {
    label: 'Reviews & Reputation',
    items: [
      { name: 'Google Reviews',  description: 'Monitor and respond to Google reviews in-platform',       color: '#fff',    bg: '#4285F4', logo: 'GR', configured: false, comingSoon: true },
      { name: 'Yelp',            description: 'Track and respond to Yelp reviews and messages',          color: '#fff',    bg: '#D32323', logo: 'y',  configured: false, comingSoon: true },
      { name: 'Trustpilot',      description: 'Collect and display Trustpilot reviews',                  color: '#fff',    bg: '#00B67A', logo: 'TP', configured: false, comingSoon: true },
    ],
  },
  {
    label: 'Website & CMS',
    items: [
      { name: 'WordPress',       description: 'Sync blog posts, forms, and leads from WP sites',         color: '#fff',    bg: '#21759B', logo: 'WP', configured: false, comingSoon: true },
      { name: 'Webflow',         description: 'Pull Webflow form submissions into the CRM',              color: '#fff',    bg: '#4353FF', logo: 'WF', configured: false, comingSoon: true },
      { name: 'Squarespace',     description: 'Capture leads from Squarespace contact forms',            color: '#fff',    bg: '#121212', logo: 'SS', configured: false, comingSoon: true },
      { name: 'Wix',             description: 'Sync Wix Forms and e-commerce data',                      color: '#fff',    bg: '#0C6EFC', logo: 'W',  configured: false, comingSoon: true },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { name: 'Redis',           description: 'BullMQ job queue for automations and email delivery',     color: '#fff',    bg: '#DC2626', logo: 'R',  configured: false },
      { name: 'Cloudflare',      description: 'CDN, DNS, and DDoS protection for hosted sites',         color: '#fff',    bg: '#F38020', logo: 'CF', configured: false, comingSoon: true },
      { name: 'AWS S3',          description: 'Store media, receipts, and proposal PDFs in S3',         color: '#fff',    bg: '#FF9900', logo: 'S3', configured: false, comingSoon: true },
    ],
  },
];

type LiveStatus = Record<LiveKey, boolean>;

export default function IntegrationsPage() {
  const [gcalConnected, setGcalConnected]           = useState(false);
  const [gcalLoading, setGcalLoading]               = useState(true);
  const [gcalDisconnecting, setGcalDisconnecting]   = useState(false);
  const [toast, setToast]                           = useState('');
  const [liveStatus, setLiveStatus]                 = useState<LiveStatus | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/google/calendar/status').then((r) => r.json()).catch(() => ({ connected: false })),
      fetch('/api/system/integrations/status').then((r) => r.json()).catch(() => null),
    ]).then(([gcal, status]) => {
      setGcalConnected(gcal.connected ?? false);
      setGcalLoading(false);
      if (status) setLiveStatus(status);
    });

    const params = new URLSearchParams(window.location.search);
    const result = params.get('gcal');
    if (result === 'connected') { setGcalConnected(true); setToast('Google Calendar connected successfully.'); }
    if (result === 'error')     { setToast('Google Calendar connection failed — check your OAuth credentials.'); }
    if (result) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  async function disconnectGcal() {
    setGcalDisconnecting(true);
    await fetch('/api/google/calendar/disconnect', { method: 'POST' });
    setGcalConnected(false);
    setGcalDisconnecting(false);
    setToast('Google Calendar disconnected.');
  }

  function isItemActive(item: Integration): boolean {
    if (item.liveAction === 'google-calendar') return gcalConnected;
    if (item.liveStatusKey && liveStatus) return liveStatus[item.liveStatusKey];
    return item.configured;
  }

  const allItems         = CATEGORIES.flatMap((c) => c.items);
  const configuredCount  = allItems.filter((i) => isItemActive(i)).length;
  const availableCount   = allItems.filter((i) => !i.comingSoon).length;
  const comingSoonCount  = allItems.filter((i) => i.comingSoon).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="page-sub">Connect client systems and your agency stack to the admin panel</p>
        </div>
      </div>

      {toast && (
        <div style={{ padding: '12px 16px', background: toast.includes('success') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${toast.includes('success') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 10, marginBottom: 20, fontSize: '0.83rem', color: toast.includes('success') ? 'var(--green)' : 'var(--red)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{toast}</span>
          <button onClick={() => setToast('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>x</button>
        </div>
      )}

      {/* Summary Chips */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        {[
          { label: 'Connected',     value: configuredCount, badge: 'badge-green' },
          { label: 'Available Now', value: availableCount,  badge: 'badge-blue' },
          { label: 'Coming Soon',   value: comingSoonCount, badge: 'badge-gray' },
          { label: 'Total',         value: allItems.length, badge: 'badge-purple' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--white)', fontFamily: 'var(--font-display)' }}>{s.value}</span>
            <span className={`badge ${s.badge}`} style={{ fontSize: '0.7rem' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {CATEGORIES.map((cat) => (
        <section key={cat.label} style={{ marginBottom: 40 }}>
          <h2 style={{
            fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--gray)',
            marginBottom: 14, paddingBottom: 8,
            borderBottom: '1px solid var(--border)',
          }}>
            {cat.label}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {cat.items.map((item) => {
              const isGcal   = item.liveAction === 'google-calendar';
              const isActive = isItemActive(item);
              return (
                <div key={item.name} className="card" style={{ padding: 20, opacity: item.comingSoon ? 0.75 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: item.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: `0 2px 8px ${item.bg}55`,
                    }}>
                      <span style={{
                        color: item.color,
                        fontSize: item.logo.length > 2 ? 11 : item.logo.length === 2 ? 13 : 18,
                        fontWeight: 800,
                        letterSpacing: item.logo.length > 2 ? '-0.02em' : '0',
                        fontFamily: 'var(--font-display)',
                        lineHeight: 1,
                      }}>
                        {item.logo}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </span>
                        {item.comingSoon && (
                          <span className="badge badge-gray" style={{ fontSize: '0.6rem' }}>Soon</span>
                        )}
                      </div>
                      {gcalLoading && isGcal ? (
                        <span className="badge badge-gray" style={{ fontSize: '0.62rem' }}>Checking...</span>
                      ) : (
                        <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.62rem' }}>
                          {isActive ? 'Connected' : 'Not configured'}
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.76rem', color: 'var(--gray)', lineHeight: 1.5, marginBottom: 14 }}>
                    {item.description}
                  </p>

                  {isGcal ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {gcalConnected ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--green)', flex: 1 }}>
                            <Check size={12} />
                            Syncing appointments
                          </div>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.72rem', color: 'var(--red)' }}
                            onClick={disconnectGcal}
                            disabled={gcalDisconnecting}
                          >
                            {gcalDisconnecting ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={11} />}
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <a
                          href="/api/google/calendar/connect"
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <Settings size={11} />
                          Connect Google Calendar
                        </a>
                      )}
                    </div>
                  ) : (
                    <button
                      className={`btn ${isActive ? 'btn-ghost' : 'btn-secondary'} btn-sm`}
                      style={{ width: '100%', justifyContent: 'center', opacity: item.comingSoon ? 0.5 : 1 }}
                      disabled={item.comingSoon}
                    >
                      <Settings size={11} />
                      {isActive ? 'Manage' : item.comingSoon ? 'Coming Soon' : 'Configure'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
