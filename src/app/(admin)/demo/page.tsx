import Link from 'next/link';
import { ExternalLink, Monitor } from 'lucide-react';

const LIVE_INDUSTRIES = new Set([
  'Home Services', 'Restaurant', 'Dental', 'Legal', 'Real Estate',
  'Automotive', 'Healthcare', 'Fitness', 'Beauty', 'Technology',
]);

const PRESENT_SLUGS: Record<string, string> = {
  'Dental':     'dental',
  'Restaurant': 'restaurant',
  'Roofing':    'roofing',
  'Legal':      'legal',
};

const ALL_INDUSTRIES = [
  'Home Services', 'Restaurant', 'Dental', 'Legal', 'Real Estate', 'Automotive',
  'Healthcare', 'Fitness', 'Beauty', 'Technology', 'Roofing', 'HVAC', 'Plumbing',
  'Electrical', 'Landscaping', 'Cleaning', 'Childcare', 'Education', 'Finance',
  'Retail', 'Pet Services', 'Photography', 'Event Planning', 'Accounting', 'Insurance',
];

export default function DemoPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Demo Center</h1>
          <p className="page-sub">Live demo environments for 25 industries</p>
        </div>
        <Link href="/demo-center/present" className="btn btn-primary btn-sm">
          <Monitor size={13} />
          Present Mode
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div className="card-green" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="kpi-value-green" style={{ fontSize: '1.6rem' }}>10</div>
          <div className="kpi-label">Live</div>
        </div>
        <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="kpi-value" style={{ fontSize: '1.6rem' }}>15</div>
          <div className="kpi-label">Coming Soon</div>
        </div>
        <div className="card-blue" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="kpi-value" style={{ fontSize: '1.6rem' }}>25</div>
          <div className="kpi-label">Total Industries</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {ALL_INDUSTRIES.map((industry) => {
          const isLive = LIVE_INDUSTRIES.has(industry);
          const slug   = PRESENT_SLUGS[industry];
          const href   = slug
            ? `/demo-center/present?industry=${slug}`
            : '/demo-center/present';

          return (
            <div key={industry} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--white)' }}>{industry}</span>
                <span className={`badge ${isLive ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                  {isLive ? 'Live' : 'Coming Soon'}
                </span>
              </div>
              {isLive ? (
                <Link
                  href={href}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <ExternalLink size={12} />
                  Present
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
    </>
  );
}
