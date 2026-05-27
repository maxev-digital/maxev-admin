'use client';

import { useState } from 'react';
import {
  Bot, Navigation, FileText, UserPlus, CheckSquare,
  MessageSquare, BarChart2, AlertCircle, Zap, ChevronDown, ChevronRight,
} from 'lucide-react';

interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeColor?: string;
  content: React.ReactNode;
}

function AccordionItem({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ marginBottom: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ color: 'var(--primary)', flexShrink: 0 }}>{section.icon}</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--white)', flex: 1 }}>{section.title}</span>
        {section.badge && (
          <span
            className="badge"
            style={{
              background: section.badgeColor ?? 'var(--primary)',
              color: '#fff', fontSize: 10, padding: '2px 8px',
            }}
          >
            {section.badge}
          </span>
        )}
        {open ? <ChevronDown size={16} color="var(--gray)" /> : <ChevronRight size={16} color="var(--gray)" />}
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px' }}>{section.content}</div>
      )}
    </div>
  );
}

function ExampleChip({ text }: { text: string }) {
  return (
    <span
      style={{
        display: 'inline-block', background: '#1a2035', border: '1px solid var(--border)',
        borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--gray)',
        fontFamily: 'monospace', margin: '3px 4px 3px 0',
      }}
    >
      &ldquo;{text}&rdquo;
    </span>
  );
}

function Limit({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: 13, color: 'var(--gray)' }}>{text}</span>
    </div>
  );
}

function Capability({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <Zap size={14} color="var(--green)" style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: 13, color: 'var(--gray)' }}>{text}</span>
    </div>
  );
}

const SECTIONS: Section[] = [
  {
    id: 'navigate',
    icon: <Navigation size={18} />,
    title: 'Navigation & Page Control',
    badge: 'LIVE',
    badgeColor: 'var(--green)',
    content: (
      <div>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14, lineHeight: 1.6 }}>
          Ask the assistant to take you anywhere in the platform — it navigates and summarizes what you&apos;ll see before you get there.
          Supports filter parameters so the page loads pre-filtered.
        </p>
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.07em', marginBottom: 8 }}>TRY ASKING</p>
          <ExampleChip text="Show me overdue invoices" />
          <ExampleChip text="Take me to hot leads" />
          <ExampleChip text="Open urgent support tickets" />
          <ExampleChip text="Pull up the pipeline" />
          <ExampleChip text="Go to tasks that are overdue" />
          <ExampleChip text="Show me the revenue tracker" />
        </div>
        <Capability text="Navigates to any of 20+ pages automatically" />
        <Capability text="Applies filters (status=OVERDUE, priority=URGENT, stage=HOT) on arrival" />
        <Capability text="Tells you what you'll find before navigating" />
      </div>
    ),
  },
  {
    id: 'data',
    icon: <BarChart2 size={18} />,
    title: 'Live Business Data & Answers',
    badge: 'LIVE',
    badgeColor: 'var(--green)',
    content: (
      <div>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14, lineHeight: 1.6 }}>
          The assistant has real-time access to your business data on every message — clients, invoices, leads, tickets, tasks, and proposals.
          Ask it anything about the current state of your business.
        </p>
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.07em', marginBottom: 8 }}>TRY ASKING</p>
          <ExampleChip text="How much is overdue right now?" />
          <ExampleChip text="Who are my active clients?" />
          <ExampleChip text="What's my total MRR?" />
          <ExampleChip text="Which leads are hot?" />
          <ExampleChip text="Do I have any urgent tickets?" />
          <ExampleChip text="What tasks are due today?" />
          <ExampleChip text="What open proposals do I have?" />
          <ExampleChip text="Give me a business health check" />
        </div>
        <Capability text="Sees: active clients, MRR, overdue invoices, hot leads, open tickets, tasks due today, open proposals" />
        <Capability text="Gives specific names, amounts, and dates — no generic answers" />
      </div>
    ),
  },
  {
    id: 'proposals',
    icon: <FileText size={18} />,
    title: 'Draft Proposals',
    badge: 'APPROVAL REQUIRED',
    badgeColor: 'var(--orange)',
    content: (
      <div>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14, lineHeight: 1.6 }}>
          Ask the assistant to draft a proposal. It generates a complete draft — package tier, line items, pricing, notes — which you review and approve.
          Once approved, it saves to the database and navigates you to the proposals page.
        </p>
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.07em', marginBottom: 8 }}>TRY ASKING</p>
          <ExampleChip text="Draft a proposal for a roofing company — Pro tier" />
          <ExampleChip text="Create a Growth package proposal for ABC Dental" />
          <ExampleChip text="Write a proposal for a new client, restaurant, starter package" />
        </div>
        <Capability text="Drafts complete proposals with line items, one-time and monthly totals" />
        <Capability text="Pre-fills industry, package tier, standard line items from context" />
        <Capability text="Saves to DB only after you click Approve — never auto-saves" />
        <Limit text="Does not send proposals — you send them manually from the Proposals page" />
        <Limit text="Cannot attach files or generate PDFs automatically" />
      </div>
    ),
  },
  {
    id: 'invoices',
    icon: <FileText size={18} />,
    title: 'Draft Invoices',
    badge: 'APPROVAL REQUIRED',
    badgeColor: 'var(--orange)',
    content: (
      <div>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14, lineHeight: 1.6 }}>
          Generate an invoice draft for any active client. The assistant pre-fills client ID, invoice type, amount, and due date.
          You approve it — it saves and you&apos;re taken to the invoices page.
        </p>
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.07em', marginBottom: 8 }}>TRY ASKING</p>
          <ExampleChip text="Invoice ABC Client for $2,500 retainer due next Friday" />
          <ExampleChip text="Create a final invoice for the Johnson project, $5,000" />
          <ExampleChip text="Draft a deposit invoice for our new roofing client" />
        </div>
        <Capability text="Supports DEPOSIT, FINAL, RETAINER, and CUSTOM invoice types" />
        <Capability text="Looks up client ID from active clients automatically" />
        <Capability text="Saves to DB only after approval" />
        <Limit text="Does not email invoices — send manually from the Invoices page" />
        <Limit text="Does not process payments or create Stripe links" />
      </div>
    ),
  },
  {
    id: 'leads',
    icon: <UserPlus size={18} />,
    title: 'Add Leads to Pipeline',
    badge: 'APPROVAL REQUIRED',
    badgeColor: 'var(--orange)',
    content: (
      <div>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14, lineHeight: 1.6 }}>
          Capture a new lead during or after a call. Tell the assistant what you know — name, industry, estimated value, priority — and it drafts the lead record for your approval.
        </p>
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.07em', marginBottom: 8 }}>TRY ASKING</p>
          <ExampleChip text="Add a hot lead — Texas Best Roofing, owner John Smith, 214-555-0100" />
          <ExampleChip text="Log a new lead from a referral, dental office in Dallas, warm priority" />
          <ExampleChip text="Create a lead: ABC Auto Shop, $3,000 estimated value, cold" />
        </div>
        <Capability text="Captures: business name, contact, phone, email, industry, stage, priority, estimated value" />
        <Capability text="Saves to the pipeline after your approval" />
        <Limit text="Cannot automatically look up business info or enrich the record" />
      </div>
    ),
  },
  {
    id: 'tasks',
    icon: <CheckSquare size={18} />,
    title: 'Create Tasks',
    badge: 'APPROVAL REQUIRED',
    badgeColor: 'var(--orange)',
    content: (
      <div>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14, lineHeight: 1.6 }}>
          Ask the assistant to add a task to your board. It drafts with title, priority, assignee, and due date — you approve and it saves.
        </p>
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.07em', marginBottom: 8 }}>TRY ASKING</p>
          <ExampleChip text="Add a task: follow up with all hot leads by Friday, high priority" />
          <ExampleChip text="Create a task to send overdue invoice reminders, assign to Will" />
          <ExampleChip text="Task: review all open proposals, due EOD Monday, medium priority" />
        </div>
        <Capability text="Creates tasks with title, priority, assignee, due date, and notes" />
        <Capability text="Saves to task board after your approval" />
      </div>
    ),
  },
  {
    id: 'updates',
    icon: <Zap size={18} />,
    title: 'Update Records',
    badge: 'CONFIRMATION REQUIRED',
    badgeColor: 'var(--primary)',
    content: (
      <div>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14, lineHeight: 1.6 }}>
          Ask the assistant to update a specific record — move a lead stage, mark an invoice paid, close a ticket, add a note.
          It shows you exactly what will change and asks for confirmation before touching the database.
        </p>
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.07em', marginBottom: 8 }}>TRY ASKING</p>
          <ExampleChip text="Mark the ABC Client invoice as paid" />
          <ExampleChip text="Move the Johnson lead to Proposal Sent" />
          <ExampleChip text="Close ticket about billing issue" />
          <ExampleChip text="Add a note to the hot lead from Dallas" />
        </div>
        <Capability text="Supports: update invoice status, move lead stage, close ticket, add activity note" />
        <Capability text="Always shows confirmation card before writing to DB" />
        <Limit text="Cannot bulk-update multiple records in one action" />
      </div>
    ),
  },
  {
    id: 'comms',
    icon: <MessageSquare size={18} />,
    title: 'Draft Communications',
    badge: 'COPY TO SEND',
    badgeColor: 'var(--gray)',
    content: (
      <div>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14, lineHeight: 1.6 }}>
          Ask the assistant to write outreach emails, payment reminders, follow-up messages, or SMS drafts.
          It writes the full message using real client data — you copy it and send it yourself.
        </p>
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.07em', marginBottom: 8 }}>TRY ASKING</p>
          <ExampleChip text="Write a payment reminder for the overdue ABC Client invoice" />
          <ExampleChip text="Draft a follow-up email for my hot leads" />
          <ExampleChip text="Write a cold outreach email for a roofing company" />
          <ExampleChip text="Draft an SMS for a client whose project just went live" />
        </div>
        <Capability text="Writes emails and SMS drafts using real client names and amounts" />
        <Capability text="Copy to clipboard with one click" />
        <Limit text="Does NOT send emails or SMS automatically — you send them from Outreach or Comms" />
        <Limit text="Cannot schedule messages or add them to sequences directly" />
      </div>
    ),
  },
  {
    id: 'limits',
    icon: <AlertCircle size={18} />,
    title: 'What the Assistant Cannot Do',
    badge: 'HARD LIMITS',
    badgeColor: '#ef4444',
    content: (
      <div>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14, lineHeight: 1.6 }}>
          These are permanent limitations — not roadmap items. The assistant is a read/draft/navigate tool, not an autonomous agent.
        </p>
        <Limit text="Cannot send emails, SMS, or push notifications autonomously" />
        <Limit text="Cannot process payments or generate Stripe payment links" />
        <Limit text="Cannot access external websites, Google, social media, or any outside system" />
        <Limit text="Cannot remember past conversations — each session starts fresh (within-session memory is fine)" />
        <Limit text="Cannot open or read file attachments, PDFs, or images" />
        <Limit text="Cannot bulk-create or bulk-update records (one record per approved action)" />
        <Limit text="Cannot access data outside this platform (QuickBooks, CRMs, email inboxes)" />
        <Limit text="Cannot take actions without your explicit approval on draft and confirm cards" />
        <Limit text="Cannot generate real PDFs or printable documents — text drafts only" />
      </div>
    ),
  },
];

export default function AIAssistantPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--white)', margin: 0 }}>MAX AI Assistant</h1>
            <p style={{ fontSize: 13, color: 'var(--gray)', margin: 0 }}>Your executive assistant — capabilities and limits</p>
          </div>
        </div>
        <div className="card" style={{ padding: '14px 18px', borderLeft: '3px solid var(--primary)', marginTop: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--gray)', margin: 0, lineHeight: 1.6 }}>
            Open the AI panel with the tab on the right edge of the screen. It has live access to all your business data and can navigate the platform, draft documents, and update records — all with your approval.
          </p>
        </div>
      </div>

      {/* Capability matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Navigate Pages', color: 'var(--green)', desc: 'Fully automatic' },
          { label: 'Answer Questions', color: 'var(--green)', desc: 'Fully automatic' },
          { label: 'Draft Documents', color: 'var(--orange)', desc: 'Requires approval' },
          { label: 'Create Records', color: 'var(--orange)', desc: 'Requires approval' },
          { label: 'Update Records', color: 'var(--primary)', desc: 'Requires confirmation' },
          { label: 'Draft Messages', color: 'var(--gray)', desc: 'You send manually' },
        ].map((item) => (
          <div key={item.label} className="card" style={{ padding: '14px 16px', borderTop: `3px solid ${item.color}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', margin: '0 0 4px' }}>{item.label}</p>
            <p style={{ fontSize: 11, color: 'var(--gray)', margin: 0 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Accordion sections */}
      {SECTIONS.map((s) => <AccordionItem key={s.id} section={s} />)}

      <p style={{ fontSize: 11, color: '#444', textAlign: 'center', marginTop: 24 }}>
        MAX AI Assistant — powered by Claude Haiku (navigation) and Claude Sonnet (analysis &amp; drafts)
      </p>
    </div>
  );
}
