import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { claudeStream, MODELS } from '@/lib/claude';
import { prisma } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

// ── SSE helpers ────────────────────────────────────────────────────────────────

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

function sseError(msg: string): Response {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`));
        c.close();
      },
    }),
    { headers: SSE_HEADERS }
  );
}

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

// ── Routes ─────────────────────────────────────────────────────────────────────

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
];

// ── Tool definitions ───────────────────────────────────────────────────────────

const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'navigate',
    description: 'Navigate to a page in the admin panel. Use this whenever the user asks to go to, show, or open a page.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path including any query params, e.g. /invoices?status=OVERDUE' },
        description: { type: 'string', description: 'Short label shown in the UI, e.g. "Overdue Invoices"' },
      },
      required: ['path', 'description'],
    },
  },
  {
    name: 'filter',
    description: 'Navigate to a page with specific filter parameters applied.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        params: { type: 'object', description: 'Query params object e.g. { "status": "OVERDUE" }' },
        description: { type: 'string' },
      },
      required: ['path', 'params', 'description'],
    },
  },
  {
    name: 'draft_proposal',
    description: 'Open a proposal draft form pre-filled with details for the user to review and approve.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Short label, e.g. "Proposal for Acme Corp"' },
        businessName: { type: 'string' },
        industry: { type: 'string' },
        packageTier: { type: 'string', enum: ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'] },
        lineItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['one-time', 'monthly'] },
              price: { type: 'string' },
            },
            required: ['name', 'type', 'price'],
          },
        },
        oneTimeTotal: { type: 'number' },
        monthlyTotal: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['businessName', 'industry', 'packageTier', 'lineItems', 'oneTimeTotal', 'monthlyTotal'],
    },
  },
  {
    name: 'draft_invoice',
    description: 'Open an invoice draft form pre-filled for the user to review and approve.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        clientId: { type: 'string', description: 'UUID of the client from context' },
        clientName: { type: 'string' },
        invoiceType: { type: 'string', enum: ['DEPOSIT', 'FINAL', 'RETAINER', 'CUSTOM'] },
        amount: { type: 'number' },
        dueDate: { type: 'string', description: 'YYYY-MM-DD format' },
        notes: { type: 'string' },
      },
      required: ['clientName', 'invoiceType', 'amount'],
    },
  },
  {
    name: 'create_lead',
    description: 'Open a new lead form pre-filled for the user to confirm and save.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        businessName: { type: 'string' },
        contactName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        industry: { type: 'string' },
        stage: { type: 'string', enum: ['LEAD', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONTRACT_SIGNED'] },
        priority: { type: 'string', enum: ['HOT', 'WARM', 'COLD'] },
        estimatedValue: { type: 'number' },
        source: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['businessName'],
    },
  },
  {
    name: 'create_task',
    description: 'Open a new task form pre-filled for the user to confirm.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        title: { type: 'string' },
        priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
        assignedTo: { type: 'string' },
        dueDate: { type: 'string', description: 'YYYY-MM-DD format' },
        notes: { type: 'string' },
      },
      required: ['title', 'priority'],
    },
  },
  {
    name: 'confirm_update',
    description: 'Ask the user to confirm a record update before it executes (invoice status, lead stage, close ticket, add note).',
    input_schema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['update_invoice_status', 'move_lead_stage', 'close_ticket', 'add_note'],
        },
        description: { type: 'string', description: 'Plain English summary of what will change' },
        payload: { type: 'object', description: 'Record IDs and new values needed to execute the update' },
      },
      required: ['operation', 'description', 'payload'],
    },
  },
  {
    name: 'draft_message',
    description: 'Compose an email or SMS for the user to review and then actually send via the platform.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        to: { type: 'string', description: 'Email address or phone number' },
        subject: { type: 'string', description: 'Email subject line (email only)' },
        body: { type: 'string', description: 'Full message body' },
        channel: { type: 'string', enum: ['email', 'sms'] },
        clientId: { type: 'string', description: 'Client UUID if known from context' },
      },
      required: ['to', 'body', 'channel'],
    },
  },
  {
    name: 'send_proposal',
    description: 'Send a proposal with e-sign link to a pipeline lead after user confirmation.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        leadId: { type: 'string', description: 'Lead UUID from context — must be a real ID' },
        leadName: { type: 'string' },
        packageTier: { type: 'string', enum: ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'] },
        lineItems: { type: 'array', items: { type: 'object' } },
        oneTimeTotal: { type: 'number' },
        monthlyTotal: { type: 'number' },
        message: { type: 'string', description: 'Personalized note to include in the email' },
      },
      required: ['leadId', 'leadName', 'packageTier', 'oneTimeTotal', 'monthlyTotal'],
    },
  },
  {
    name: 'convert_client',
    description: 'Convert a CONTRACT_SIGNED lead to an active client after user confirmation.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        leadId: { type: 'string', description: 'Lead UUID from context — must be a real ID' },
        leadName: { type: 'string' },
        packageTier: { type: 'string', enum: ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'] },
        setupFee: { type: 'string' },
        monthly: { type: 'string' },
      },
      required: ['leadId', 'leadName', 'packageTier'],
    },
  },
];

// ── Tool → front-end action shape ─────────────────────────────────────────────

function toolToAction(toolName: string, input: Record<string, unknown>): Record<string, unknown> | null {
  const { description, ...data } = input;
  const desc = (description as string) || toolName;

  switch (toolName) {
    case 'navigate':
      return { type: 'navigate', path: input.path, description: input.description };
    case 'filter':
      return { type: 'filter', path: input.path, params: input.params, description: input.description };
    case 'draft_proposal':
      return { type: 'draft', docType: 'proposal', description: desc, data };
    case 'draft_invoice':
      return { type: 'draft', docType: 'invoice', description: desc, data };
    case 'create_lead':
      return { type: 'draft', docType: 'lead', description: desc, data };
    case 'create_task':
      return { type: 'draft', docType: 'task', description: desc, data };
    case 'draft_message':
      return { type: 'draft', docType: 'message', description: desc, data };
    case 'confirm_update':
      return { type: 'confirm', operation: input.operation, description: input.description, payload: input.payload };
    case 'send_proposal':
      return { type: 'confirm', operation: 'send_proposal', description: desc, payload: data };
    case 'convert_client':
      return { type: 'confirm', operation: 'convert_client', description: desc, payload: data };
    default:
      return null;
  }
}

// ── System prompt ──────────────────────────────────────────────────────────────

const BASE_SYSTEM = `You are an AI personal business assistant embedded in the MAX EV Platform admin panel. You run in a right-side panel. The owner speaks to you like a sharp executive assistant who knows every detail of the business.

You have full access to live business data shown below. Use it to give specific, accurate answers — not generic advice.

PAGES YOU CAN NAVIGATE TO:
${ROUTES.map(r => `- ${r.label} (${r.path}): ${r.description}`).join('\n')}

CAPABILITIES:
1. NAVIGATE — Use the navigate or filter tool to go to any page.
2. ANSWER WITH DATA — Answer questions using the live data. Be specific: names, amounts, dates.
3. DRAFT PROPOSAL — Use the draft_proposal tool to generate a complete proposal for approval.
4. DRAFT INVOICE — Use the draft_invoice tool to generate an invoice for approval.
5. CREATE LEAD — Use the create_lead tool to capture a new lead with confirmation.
6. CREATE TASK — Use the create_task tool to add a task with confirmation.
7. UPDATE RECORD — Use the confirm_update tool to change invoice status, move lead stage, close ticket, or add note.
8. SEND COMMUNICATION — Use the draft_message tool. You draft it, user sees the full preview and approves, then it actually sends via platform SMTP/SMS.
9. SEND PROPOSAL — Use the send_proposal tool. Pre-fill from context. Lead IDs are shown in brackets in the leads list.
10. CONVERT TO CLIENT — Use the convert_client tool. Lead must be past PROPOSAL_SENT stage.

RESPONSE STYLE:
- Your text response is the direct message to the user — write concise prose, no JSON.
- Use the tools to take actions. Never describe action JSON in your text.
- Navigation requests: navigate + narrate ("Pulling up your overdue invoices — you have 3 totaling $5,200.").
- Data questions: answer directly with specifics before navigating.
- Creation requests: use the tool to generate a complete draft, prefill all fields you know from context.
- Keep messages to 2-5 sentences. Use line breaks. No filler.
- Sound like a sharp executive assistant, not a chatbot.
- Never make up data. Use real names and numbers from the live context.`;

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

    if (!message?.trim()) return sseError('No message received.');

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

    const rawStream = await claudeStream(`${historyBlock}User: ${message}`, {
      model,
      maxTokens: 800,
      system: systemPrompt,
      tools: CHAT_TOOLS,
    });

    // Transform stream: map tool calls to front-end action shapes + fire audit log
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (!part.startsWith('data: ')) {
            controller.enqueue(encoder.encode(part + '\n\n'));
            continue;
          }
          try {
            const evt = JSON.parse(part.slice(6)) as {
              type: string;
              toolName?: string | null;
              toolInput?: Record<string, unknown> | null;
              model?: string;
              text?: string;
              message?: string;
            };

            if (evt.type === 'done') {
              const action = evt.toolName
                ? toolToAction(evt.toolName, evt.toolInput ?? {})
                : null;

              if (action) {
                prisma.aiActionLog.create({
                  data: {
                    message: message.slice(0, 500),
                    actionType: String(action.type ?? 'unknown'),
                    actionPayload: JSON.stringify(action),
                    model,
                  },
                }).catch(() => {});
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'done', action, model: evt.model })}\n\n`
                )
              );
            } else {
              controller.enqueue(encoder.encode(part + '\n\n'));
            }
          } catch {
            controller.enqueue(encoder.encode(part + '\n\n'));
          }
        }
      },
      flush(controller) {
        if (buffer.trim()) controller.enqueue(encoder.encode(buffer));
      },
    });

    return new Response(rawStream.pipeThrough(transform), { headers: SSE_HEADERS });
  } catch (err) {
    console.error('[ai/chat]', err);
    return sseError('Something went wrong. Please try again.');
  }
}
