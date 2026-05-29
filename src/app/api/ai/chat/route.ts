import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { claudeComplete, MODELS } from '@/lib/claude';
import { prisma } from '@/lib/db';

// ── DB context snapshot ────────────────────────────────────────────────────────

let contextCache: { data: Awaited<ReturnType<typeof _fetchBusinessContext>>; ts: number } | null = null;
const CACHE_TTL = 60_000;

async function fetchBusinessContext() {
  if (contextCache && Date.now() - contextCache.ts < CACHE_TTL) return contextCache.data;
  const data = await _fetchBusinessContext();
  contextCache = { data, ts: Date.now() };
  return data;
}

async function _fetchBusinessContext() {
  try {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      overdueInvoices,
      recentInvoices,
      hotLeads,
      allLeads,
      openTickets,
      tasksDue,
      activeClients,
      proposals,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: { status: 'OVERDUE' },
        include: { client: { select: { businessName: true, contactName: true, email: true } } },
        orderBy: { dueDate: 'asc' },
        take: 15,
      }),
      prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { businessName: true } } },
        take: 5,
      }),
      prisma.lead.findMany({
        where: { priority: 'HOT', stage: { notIn: ['DEAD', 'ON_RETAINER'] } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      prisma.lead.findMany({
        where: { stage: { notIn: ['DEAD'] } },
        select: { id: true, businessName: true, contactName: true, stage: true, priority: true, estimatedValue: true, phone: true, email: true, industry: true },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),
      prisma.ticket.findMany({
        where: { status: { in: ['OPEN', 'URGENT'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.task.findMany({
        where: { status: { not: 'DONE' }, dueDate: { lte: todayEnd } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.client.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, businessName: true, contactName: true, email: true, phone: true, mrr: true, industry: true, packageTier: true },
        orderBy: { businessName: 'asc' },
      }),
      prisma.proposal.findMany({
        where: { status: { in: ['DRAFT', 'SENT', 'VIEWED'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const overdueTotal = overdueInvoices.reduce((s, i) => s + i.amount, 0);

    const contextLines = [
      `ACTIVE CLIENTS (${activeClients.length}):`,
      ...activeClients.map(c => `  - ${c.businessName} | ${c.industry} | ${c.packageTier} | MRR $${c.mrr} | Contact: ${c.contactName ?? 'unknown'} ${c.email ? `<${c.email}>` : ''} ${c.phone ?? ''}`),
      '',
      `OVERDUE INVOICES (${overdueInvoices.length}, total $${overdueTotal.toLocaleString()}):`,
      ...overdueInvoices.map(i => `  - ${i.client.businessName}: $${i.amount.toLocaleString()} | ${i.invoiceNumber} | Due: ${i.dueDate ? new Date(i.dueDate).toLocaleDateString() : 'no date'}`),
      '',
      `HOT LEADS IN PIPELINE (${hotLeads.length}):`,
      ...hotLeads.map(l => `  - [ID:${l.id}] ${l.businessName} | Stage: ${l.stage} | Value: $${l.estimatedValue ?? '?'} | ${l.contactName ?? ''} ${l.phone ?? ''} ${l.email ?? ''}`),
      '',
      `ALL ACTIVE LEADS (${allLeads.length}):`,
      ...allLeads.map(l => `  - [ID:${l.id}] ${l.businessName} | ${l.stage} | ${l.priority} | Industry: ${l.industry}`),
      '',
      `OPEN SUPPORT TICKETS (${openTickets.length}):`,
      ...openTickets.map(t => `  - [${t.priority}] "${t.subject}" from ${t.fromName} | Status: ${t.status} | ID: ${t.id}`),
      '',
      `TASKS DUE TODAY OR OVERDUE (${tasksDue.length}):`,
      ...tasksDue.map(t => `  - [${t.priority}] ${t.title} | Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'no date'} | Assigned: ${t.assignedTo ?? 'unassigned'} | ID: ${t.id}`),
      '',
      `OPEN PROPOSALS (${proposals.length}):`,
      ...proposals.map(p => `  - ${p.businessName} | ${p.status} | $${p.oneTimeTotal} + $${p.monthlyTotal}/mo | ${p.proposalNumber}`),
    ];

    return { context: contextLines.join('\n'), clients: activeClients, leads: allLeads };
  } catch {
    return { context: 'Business data temporarily unavailable.', clients: [], leads: [] };
  }
}

// ── Routes the AI can navigate ─────────────────────────────────────────────────

const ROUTES = [
  { path: '/dashboard',          label: 'Dashboard',          description: 'KPIs, MRR, active clients, activity feed' },
  { path: '/analytics',          label: 'Analytics',          description: 'Traffic, conversion, performance charts' },
  { path: '/revenue',            label: 'Revenue Tracker',    description: 'Monthly/annual revenue, ARR, breakdown by client' },
  { path: '/ai-insights',        label: 'MAX CEO Intel',      description: 'AI daily briefing, health score, pipeline nudges' },
  { path: '/clients',            label: 'All Clients',        description: 'Full client list with status, MRR, package tier' },
  { path: '/clients/projects',   label: 'Active Projects',    description: 'Projects: in progress, review, live' },
  { path: '/proposals',          label: 'Proposals',          description: 'Sales proposals: draft, sent, signed, declined' },
  { path: '/invoices',           label: 'Invoices',           description: 'All invoices — supports ?status=OVERDUE|PAID|PENDING|SENT' },
  { path: '/pipeline',           label: 'Lead Pipeline',      description: 'Kanban pipeline — supports ?stage=HOT|DEMO_SCHEDULED etc.' },
  { path: '/pipeline/hot',       label: 'Hot Leads',          description: 'Hot priority leads needing immediate follow-up' },
  { path: '/pipeline/demos',     label: 'Demos Scheduled',    description: 'Leads with demo/discovery calls booked' },
  { path: '/prospects',          label: 'Prospect Database',  description: 'Prospect list with presence scores and outreach status' },
  { path: '/leads',              label: 'DFW Lead Queue',     description: '45,000+ DFW business leads' },
  { path: '/outreach',           label: 'Outreach Hub',       description: 'Email campaigns, sequences, templates' },
  { path: '/comms',              label: 'Communications',     description: 'SMS, newsletter, subscribers, automation' },
  { path: '/finance',            label: 'Finance',            description: 'P&L, expenses, contracts, financial reports' },
  { path: '/helpdesk',           label: 'Helpdesk',           description: 'Support tickets — supports ?priority=URGENT|HIGH' },
  { path: '/tasks',              label: 'Tasks',              description: 'Task kanban — supports ?status=TODO|IN_PROGRESS|OVERDUE' },
  { path: '/inventory',          label: 'Inventory',          description: 'Products, stock levels, purchase orders, suppliers' },
  { path: '/booking',            label: 'Booking & Schedule', description: 'Appointment calendar, services, staff' },
  { path: '/system',             label: 'System Settings',    description: 'Team management, integrations, settings' },
  { path: '/ai-assistant',       label: 'AI Assistant Guide', description: 'Full capability guide — what the AI can and cannot do' },
];

// ── System prompt ──────────────────────────────────────────────────────────────

const BASE_SYSTEM = `You are an AI personal business assistant embedded in the MAX EV Platform admin panel. You run in a right-side panel. The owner speaks to you like a sharp executive assistant who knows every detail of the business.

You have full access to live business data shown below. Use it to give specific, accurate answers — not generic advice.

PAGES YOU CAN NAVIGATE TO:
${ROUTES.map(r => `- ${r.label} (${r.path}): ${r.description}`).join('\n')}

CAPABILITIES:
1. NAVIGATE — Go to any page. Use filter params when relevant (e.g., /invoices?status=OVERDUE).
2. ANSWER WITH DATA — Answer questions using the live data. Be specific: names, amounts, dates.
3. DRAFT PROPOSAL — When asked, generate a complete proposal draft for approval.
4. DRAFT INVOICE — Generate an invoice draft for approval.
5. CREATE LEAD — Capture a new lead for pipeline with confirmation.
6. CREATE TASK — Add a task with confirmation.
7. UPDATE RECORD — Change invoice status, move lead stage, close ticket, add note — all with confirmation first.
8. SEND COMMUNICATION — Draft and SEND emails/SMS through the platform. You draft it, user sees the full preview and approves, then it actually sends via our SMTP/SMS system. Use real client email/phone from context.
9. SEND PROPOSAL — Send a proposal with an e-sign link to a pipeline lead. Use the send_proposal confirm action. Pre-fill packageTier and totals from context where possible. Lead IDs are shown in brackets in the leads list above.
10. CONVERT TO CLIENT — Convert a CONTRACT_SIGNED (or later) lead into an active client. Creates client profile, setup invoice, monthly billing schedule, and install appointment. Use convert_client confirm action. Lead must be past PROPOSAL_SENT stage.

RESPONSE FORMAT — always return valid JSON:
{
  "message": "your response — specific, direct, like a sharp assistant",
  "action": { ... }  // OPTIONAL — only include when needed
}

ACTION TYPES:

Navigate:
{ "type": "navigate", "path": "/path", "description": "label for UI" }

Navigate with filter:
{ "type": "filter", "path": "/invoices", "params": {"status": "OVERDUE"}, "description": "Filtered to overdue invoices" }

Draft proposal:
{ "type": "draft", "docType": "proposal", "description": "Proposal for X", "data": { "businessName": "", "industry": "", "packageTier": "STARTER|GROWTH|PRO|ENTERPRISE", "lineItems": [{"name": "", "type": "one-time|monthly", "price": "0"}], "oneTimeTotal": 0, "monthlyTotal": 0, "notes": "" } }

Draft invoice:
{ "type": "draft", "docType": "invoice", "description": "Invoice for X", "data": { "clientId": "", "clientName": "", "invoiceType": "DEPOSIT|FINAL|RETAINER|CUSTOM", "amount": 0, "dueDate": "YYYY-MM-DD", "notes": "" } }

Create lead:
{ "type": "draft", "docType": "lead", "description": "New lead: X", "data": { "businessName": "", "contactName": "", "email": "", "phone": "", "industry": "", "stage": "LEAD", "priority": "HOT|WARM|COLD", "estimatedValue": 0, "source": "", "notes": "" } }

Create task:
{ "type": "draft", "docType": "task", "description": "New task", "data": { "title": "", "priority": "HIGH|MEDIUM|LOW", "assignedTo": "", "dueDate": "YYYY-MM-DD", "notes": "" } }

Confirm update:
{ "type": "confirm", "operation": "update_invoice_status|move_lead_stage|close_ticket|add_note", "description": "what will happen", "payload": { ... relevant fields including id } }

Draft outreach message (will actually send via the platform on approval — not clipboard):
{ "type": "draft", "docType": "message", "description": "Outreach draft", "data": { "to": "recipient@email.com or +1XXXXXXXXXX", "subject": "Subject line (email only)", "body": "Full message body", "channel": "email|sms", "clientId": "client UUID if known from context" } }

Send proposal with e-sign link (use real leadId from context):
{ "type": "confirm", "operation": "send_proposal", "description": "Send PRO proposal to William Peterson ($2,898 setup + $49/mo)", "payload": { "leadId": "lead-uuid-from-context", "leadName": "William Peterson", "packageTier": "PRO", "lineItems": [{"name": "PRO Security Package", "type": "one-time", "price": "2898"}], "oneTimeTotal": 2898, "monthlyTotal": 49, "message": "" } }

Convert lead to active client (use real leadId from context):
{ "type": "confirm", "operation": "convert_client", "description": "Convert William Peterson to active client (PRO, $2,898 setup, $49/mo)", "payload": { "leadId": "lead-uuid-from-context", "leadName": "William Peterson", "packageTier": "PRO", "setupFee": "2898", "monthly": "49" } }

BEHAVIOR RULES:
- Be specific. Use real names and numbers from the live data. Never make up data.
- Navigation requests: navigate + narrate ("Pulling up your overdue invoices — you have 3 totaling $5,200.")
- Data questions: answer directly with specifics before navigating.
- Creation requests: generate a complete draft, prefill all fields you know from context.
- When asked about a specific client/lead: use their real data from the context.
- Keep messages concise — 2-5 sentences. Use line breaks. No filler.
- Sound like a sharp executive assistant, not a chatbot.`;

// ── Model routing ──────────────────────────────────────────────────────────────

function pickModel(message: string): typeof MODELS.haiku | typeof MODELS.sonnet {
  const lower = message.toLowerCase();
  const analysisSignals = [
    'analyze', 'why', 'how is', 'what should', 'recommend', 'suggest',
    'compare', 'trend', 'insights', 'strategy', 'improve', 'optimize',
    'health', 'performance', 'forecast', 'explain', 'review', 'assess',
    'draft', 'write', 'compose', 'proposal', 'invoice', 'create', 'generate',
  ];
  if (analysisSignals.some(kw => lower.includes(kw))) return MODELS.sonnet;
  if (message.length > 120) return MODELS.sonnet;
  return MODELS.haiku;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { message, history, currentPath } = await req.json() as {
      message: string;
      history: Array<{ role: string; content: string }>;
      currentPath: string;
    };

    if (!message?.trim()) {
      return NextResponse.json({ message: 'No message received.', action: null });
    }

    const [{ context }, model] = await Promise.all([
      fetchBusinessContext(),
      Promise.resolve(pickModel(message)),
    ]);

    const systemPrompt = `${BASE_SYSTEM}

LIVE BUSINESS DATA:
${context}

User is currently viewing: ${currentPath}`;

    const historyBlock = history.length > 0
      ? 'Conversation so far:\n' + history.map(m =>
          `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
        ).join('\n') + '\n\n'
      : '';

    const raw = await claudeComplete(`${historyBlock}User: ${message}`, {
      model,
      maxTokens: 800,
      system: systemPrompt,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        message: raw.trim(),
        action: null,
        model: model === MODELS.haiku ? 'haiku' : 'sonnet',
      });
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      message: string;
      action?: Record<string, unknown>;
    };

    return NextResponse.json({
      message: parsed.message ?? raw.trim(),
      action: parsed.action ?? null,
      model: model === MODELS.haiku ? 'haiku' : 'sonnet',
    });
  } catch (err) {
    console.error('[ai/chat]', err);
    return NextResponse.json(
      { message: 'Something went wrong. Please try again.', action: null },
      { status: 500 }
    );
  }
}
