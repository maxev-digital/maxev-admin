'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useAIHighlight } from '@/lib/ai-highlight';
import {
  LayoutDashboard, BarChart3, DollarSign, Sparkles,
  Users, FolderOpen, FileText, Receipt,
  GitBranch, Flame, CalendarCheck,
  Search, Activity, Target, Database,
  LayoutTemplate, Zap,
  Megaphone, Clock,
  Monitor, SlidersHorizontal, Presentation, Layers,
  Newspaper, MessageSquare, Mail, Inbox, History, List,
  TrendingUp, FileCheck, PenLine, BadgeDollarSign, BarChart2, Package, Wallet,
  Users2, Plug, Settings,
  LogOut, Globe, KeyRound,
  ShoppingCart, Truck, Archive,
  CalendarDays, CalendarCheck2, Stethoscope,
  LifeBuoy, AlertCircle, KanbanSquare, CheckSquare, CreditCard, Repeat,
  Briefcase,
} from 'lucide-react';

const nav = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard',     href: '/dashboard',   icon: LayoutDashboard, demo: 1  },
      { label: 'Analytics',     href: '/analytics',   icon: BarChart3,       demo: 2  },
      { label: 'Revenue',       href: '/revenue',     icon: DollarSign,      demo: 3  },
      { label: 'MAX CEO Intel', href: '/ai-insights', icon: Sparkles,        demo: 4  },
    ],
  },
  {
    group: 'Clients',
    items: [
      { label: 'All Clients',      href: '/clients',           icon: Users,      demo: 5  },
      { label: 'Active Projects',  href: '/clients/projects',  icon: FolderOpen },
      { label: 'Proposals',        href: '/proposals',         icon: FileText,   demo: 6  },
      { label: 'Invoices',         href: '/invoices',          icon: Receipt,    demo: 7  },
    ],
  },
  {
    group: 'Pipeline',
    items: [
      { label: 'Lead Pipeline',   href: '/pipeline',       icon: GitBranch,    demo: 8  },
      { label: 'Hot Leads',       href: '/pipeline/hot',   icon: Flame,        demo: 9  },
      { label: 'Demos Scheduled', href: '/pipeline/demos', icon: CalendarCheck,demo: 10 },
    ],
  },
  {
    group: 'Prospects',
    items: [
      { label: 'Prospect Database',  href: '/prospects',            icon: Database },
      { label: 'DFW Lead Queue',     href: '/leads',                icon: List },
      { label: 'Presence Grader',    href: '/prospects/grader',     icon: Activity },
      { label: 'Industry Targeting', href: '/prospects/targeting',  icon: Target },
      { label: 'Data Enrichment',    href: '/prospects/enrichment', icon: Search },
    ],
  },
  {
    group: 'Outreach',
    items: [
      { label: 'Email Campaigns', href: '/outreach/campaigns',  icon: Megaphone },
      { label: 'Templates',       href: '/outreach/templates',  icon: LayoutTemplate },
      { label: 'Drip Sequences',  href: '/outreach/sequences',  icon: Zap },
      { label: 'Scheduler',       href: '/outreach/scheduler',  icon: Clock },
    ],
  },
  {
    group: 'Demo Center',
    items: [
      { label: 'SaaS Modules',    href: '/demo-center',        icon: Layers },
      { label: 'Prospect Access', href: '/demo-center/access', icon: KeyRound },
      { label: 'Industry Demos',  href: '/demo',               icon: Monitor },
      { label: 'Demo Customizer', href: '/demo/customize',     icon: SlidersHorizontal },
      { label: 'Pitch Deck',      href: '/demo/pitch',         icon: Presentation },
    ],
  },
  {
    group: 'Communications',
    items: [
      { label: 'Email Inbox',        href: '/comms/inbox',       icon: Mail },
      { label: 'Newsletter Studio', href: '/comms/newsletter',  icon: Newspaper,     demo: 11 },
      { label: 'Template Builder',  href: '/comms/templates',   icon: LayoutTemplate },
      { label: 'SMS Inbox',         href: '/comms/sms',         icon: MessageSquare },
      { label: 'Automations',       href: '/comms/automations', icon: Zap },
      { label: 'Subscribers',       href: '/comms/subscribers', icon: List,          demo: 12 },
      { label: 'Reply Tracker',     href: '/comms/replies',     icon: Inbox },
      { label: 'Send History',      href: '/comms/history',     icon: History },
    ],
  },
  {
    group: 'Booking',
    items: [
      { label: 'Calendar',         href: '/booking',               icon: CalendarDays,  demo: 13 },
      { label: 'Appointments',     href: '/booking/appointments',  icon: CalendarCheck2,demo: 14 },
      { label: 'Services & Staff', href: '/booking/services',      icon: Stethoscope,   demo: 15 },
    ],
  },
  {
    group: 'Inventory & Ops',
    items: [
      { label: 'Stock Dashboard', href: '/inventory',          icon: Package,      demo: 16 },
      { label: 'Products',        href: '/inventory/products', icon: Archive,      demo: 17 },
      { label: 'Purchase Orders', href: '/inventory/orders',   icon: ShoppingCart, demo: 18 },
      { label: 'Suppliers',       href: '/inventory/suppliers',icon: Truck,        demo: 19 },
    ],
  },
  {
    group: 'Helpdesk',
    items: [
      { label: 'Ticket Inbox', href: '/helpdesk',        icon: LifeBuoy,   demo: 20 },
      { label: 'Open Tickets', href: '/helpdesk/open',   icon: AlertCircle,demo: 21 },
      { label: 'Macros',       href: '/helpdesk/macros', icon: Zap,        demo: 22 },
    ],
  },
  {
    group: 'Tasks',
    items: [
      { label: 'Task Board', href: '/tasks',          icon: KanbanSquare, demo: 23 },
      { label: 'My Tasks',   href: '/tasks/my-tasks', icon: CheckSquare,  demo: 24 },
    ],
  },
  {
    group: 'Finance',
    items: [
      { label: 'Revenue Tracker',  href: '/finance/revenue',    icon: TrendingUp,      demo: 25 },
      { label: 'Contracts & SOW',  href: '/finance/contracts',  icon: FileCheck },
      { label: 'Monthly Reports',  href: '/finance/reports',    icon: BarChart2,        demo: 26 },
      { label: 'Doc Packets',      href: '/finance/packets',    icon: Package },
      { label: 'Template Library', href: '/finance/templates',  icon: PenLine,          demo: 27 },
      { label: 'Expense Log',      href: '/finance/expenses',   icon: Wallet,           demo: 28 },
      { label: 'Package P&L',      href: '/finance/pnl',        icon: BadgeDollarSign,  demo: 29 },
      { label: 'Payments',         href: '/finance/payments',   icon: CreditCard,       demo: 30 },
      { label: 'Recurring Billing',href: '/finance/recurring',  icon: Repeat,           demo: 31 },
    ],
  },
  {
    group: 'Job Hunt',
    items: [
      { label: 'Job Pipeline', href: '/jobs', icon: Briefcase },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'AI Assistant',  href: '/ai-assistant',        icon: Sparkles },
      { label: 'System Health', href: '/system-health',       icon: Activity },
      { label: 'Team Members',  href: '/system/team',         icon: Users2 },
      { label: 'Integrations',  href: '/system/integrations', icon: Plug },
      { label: 'Settings',      href: '/system/settings',     icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const { isHighlighted } = useAIHighlight();
  const flashedRef = useRef<Set<string>>(new Set());

  // Clear the flash-once tracker when highlights change
  useEffect(() => {
    flashedRef.current = new Set();
  }, [isHighlighted]);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const w = collapsed ? 60 : 240;

  return (
    <aside
      className="admin-sidebar"
      style={{ width: w, minWidth: w, transition: 'width 0.22s ease', overflow: collapsed ? 'visible' : undefined }}
    >
      {/* Logo / collapse toggle */}
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? '16px 0' : undefined, gap: 8 }}>
        {!collapsed && (
          <>
            <img src="/max-ev-digital_logo.png" alt="Max EV Digital" style={{ width: 130, height: 'auto', display: 'block' }} />
            <div className="sidebar-logo-sub" style={{ display: 'none' }}>Admin Panel</div>
          </>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--gray)', padding: 4, borderRadius: 6, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {nav.map((section) => (
          <div key={section.group} className="sidebar-group">
            {!collapsed && <div className="sidebar-group-label">{section.group}</div>}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active  = isActive(item.href);
              const aiMatch = isHighlighted('nav-path', item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item ${active ? 'active' : ''} ${aiMatch ? 'ai-nav-flash' : ''}`}
                  title={collapsed ? item.label : undefined}
                  style={collapsed ? { justifyContent: 'center', padding: '8px 0' } : undefined}
                >
                  <Icon size={14} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {'demo' in item && (
                        <span style={{
                          minWidth: 18, height: 18, borderRadius: '50%',
                          background: '#f97316', color: '#fff',
                          fontSize: 10, fontWeight: 700, lineHeight: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, padding: '0 2px',
                        }}>
                          {(item as any).demo}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-item"
          onClick={toggle}
          title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          style={collapsed
            ? { width: '100%', justifyContent: 'center', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer' }
            : { width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {!collapsed && (theme === 'dark' ? 'Light Mode' : 'Dark Mode')}
        </button>
        {!collapsed && (
          <>
            <a
              href="https://maxevdigital.com"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-item"
            >
              <Globe size={14} />
              View Site
            </a>
            <Link href="/api/auth/signout" className="sidebar-item">
              <LogOut size={14} />
              Sign Out
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}
