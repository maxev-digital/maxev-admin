import { requireAuth, getProspectSession } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ProspectTracker from '@/components/ProspectTracker';
import AIChatPanel from '@/components/AIChatPanel';
import ClientProviders from '@/components/ClientProviders';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const prospectSession = await getProspectSession();
  const isProspect = !!prospectSession;

  return (
    <ClientProviders>
      <div className="admin-shell">
        <Sidebar />
        <div className="admin-main">
          <Topbar />
          <main className="admin-content">{children}</main>
        </div>
        <AIChatPanel />
        {isProspect && (
          <ProspectTracker
            prospectId={prospectSession!.prospect.id}
            prospectName={prospectSession!.prospect.name}
          />
        )}
      </div>
    </ClientProviders>
  );
}
