import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODELS = {
  // Fast + cheap — high-frequency tasks (ticket replies, simple drafts)
  haiku: 'claude-haiku-4-5-20251001',
  // Balanced — business reasoning, briefings, next-best-action
  sonnet: 'claude-sonnet-4-6',
  // Most capable — complex analysis, premium tier clients only
  opus: 'claude-opus-4-7',
} as const;

export type ClaudeModel = (typeof MODELS)[keyof typeof MODELS];

export async function claudeComplete(
  prompt: string,
  options: {
    system?: string;
    model?: ClaudeModel;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const { system, model = MODELS.sonnet, maxTokens = 1024 } = options;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: system ?? 'You are a helpful AI assistant embedded in a business management platform called MAX EV Platform, powered by Claude (Anthropic). Be concise, practical, and focused on helping small business owners.',
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text;
}

// Convenience wrappers for common use cases

export async function draftTicketReply(
  ticketSubject: string,
  ticketBody: string,
  businessContext: string
): Promise<string> {
  return claudeComplete(
    `Business context: ${businessContext}\n\nCustomer ticket:\nSubject: ${ticketSubject}\nMessage: ${ticketBody}\n\nWrite a professional, friendly reply to this customer. Be concise (2-4 sentences). Do not include a subject line or greeting — just the reply body.`,
    {
      model: MODELS.haiku,
      maxTokens: 300,
      system: 'You draft customer support replies for small businesses. Be warm, professional, and solution-focused. Keep replies short and actionable.',
    }
  );
}

export async function getDailyBriefing(context: {
  activeClients: number;
  openLeads: number;
  overdueInvoices: number;
  overdueAmount: number;
  upcomingDemos: number;
  hotLeads: string[];
  expiringProposals: string[];
  openTickets?: number;
  urgentTickets?: number;
  tasksOverdue?: number;
  tasksDueToday?: number;
  criticalStock?: number;
}): Promise<string> {
  const lines = [
    `- Active clients: ${context.activeClients}`,
    `- Open leads in pipeline: ${context.openLeads}`,
    `- Overdue invoices: ${context.overdueInvoices} totaling $${context.overdueAmount.toLocaleString()}`,
    `- Upcoming appointments today: ${context.upcomingDemos}`,
    `- Hot leads needing follow-up: ${context.hotLeads.join(', ') || 'none'}`,
    `- Proposals expiring soon: ${context.expiringProposals.join(', ') || 'none'}`,
  ];
  if (context.openTickets !== undefined) lines.push(`- Open support tickets: ${context.openTickets} (${context.urgentTickets ?? 0} urgent)`);
  if (context.tasksOverdue !== undefined) lines.push(`- Tasks overdue: ${context.tasksOverdue}, due today: ${context.tasksDueToday ?? 0}`);
  if (context.criticalStock !== undefined && context.criticalStock > 0) lines.push(`- Products at critical stock level: ${context.criticalStock}`);

  return claudeComplete(
    `Generate a concise daily business briefing for a digital marketing agency owner based on this data:\n${lines.join('\n')}\n\nWrite 4-6 bullet points covering: urgent issues first, what to prioritize today, and one growth opportunity. Start each bullet with an action verb. Flag anything critical. Be specific and direct.`,
    {
      model: MODELS.sonnet,
      maxTokens: 500,
      system: 'You are a business operations manager for a digital marketing agency. Generate concise, actionable daily briefings. Flag urgent issues at the top.',
    }
  );
}

export interface HealthScoreDimension {
  label: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  detail: string;
}

export interface HealthScoreResult {
  overall: number;
  grade: string;
  summary: string;
  dimensions: HealthScoreDimension[];
}

export interface ScoredTicket {
  id: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

export async function scoreTicketBatch(tickets: Array<{
  id: string;
  subject: string;
  body: string;
}>): Promise<ScoredTicket[]> {
  if (!tickets.length) return [];

  const list = tickets.map((t, i) =>
    `Ticket ${i + 1} (ID: ${t.id}):\nSubject: ${t.subject}\nBody: ${t.body.slice(0, 300)}`
  ).join('\n\n---\n\n');

  const prompt = `Score each support ticket's priority. Return ONLY a JSON array, no other text.

Priority levels:
- URGENT: Safety/health risk, system down, data loss, legal/compliance issue
- HIGH: Major functionality broken, significant business impact, unhappy customer
- MEDIUM: Feature issue, billing question, general inquiry with some urgency
- LOW: Minor question, feedback, nice-to-have request

Tickets:
${list}

Return this exact JSON array:
[{"id":"<ticket-id>","priority":"<URGENT|HIGH|MEDIUM|LOW>","reasoning":"<max 10 words>"}]`;

  const raw = await claudeComplete(prompt, {
    model: MODELS.haiku,
    maxTokens: 400,
    system: 'You are a support ticket triage system. Return only valid JSON.',
  });

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return tickets.map((t) => ({ id: t.id, priority: 'MEDIUM' as const, reasoning: 'Could not parse' }));
  return JSON.parse(jsonMatch[0]) as ScoredTicket[];
}

export async function getBusinessHealthScore(data: {
  revenueThisQuarter: number;
  revenueLastQuarter: number;
  activeClients: number;
  churnedLast90: number;
  pipelineValue: number;
  hotLeads: number;
  overdueInvoices: number;
  overdueAmount: number;
  proposalsSent: number;
  proposalsSigned: number;
  openTickets: number;
  urgentTickets: number;
  tasksDueToday: number;
  tasksOverdue: number;
}): Promise<HealthScoreResult> {
  const prompt = `You are a business intelligence system. Score this digital marketing agency's health across 6 dimensions. Return ONLY valid JSON, no other text.

Data:
- Revenue this quarter: $${data.revenueThisQuarter.toLocaleString()} vs last quarter $${data.revenueLastQuarter.toLocaleString()}
- Active clients: ${data.activeClients}, churned last 90 days: ${data.churnedLast90}
- Pipeline value: $${data.pipelineValue.toLocaleString()}, hot leads: ${data.hotLeads}
- Overdue invoices: ${data.overdueInvoices} totaling $${data.overdueAmount.toLocaleString()}
- Proposals sent: ${data.proposalsSent}, signed: ${data.proposalsSigned} (close rate: ${data.proposalsSent ? Math.round((data.proposalsSigned / data.proposalsSent) * 100) : 0}%)
- Open support tickets: ${data.openTickets}, urgent: ${data.urgentTickets}
- Tasks due today: ${data.tasksDueToday}, overdue tasks: ${data.tasksOverdue}

Return this exact JSON structure:
{
  "overall": <0-100 integer>,
  "grade": <"A+"|"A"|"B+"|"B"|"C+"|"C"|"D"|"F">,
  "summary": "<1 sentence plain English summary of business health>",
  "dimensions": [
    {"label":"Revenue Growth","score":<0-100>,"trend":<"up"|"down"|"stable">,"detail":"<15 words max>"},
    {"label":"Client Retention","score":<0-100>,"trend":<"up"|"down"|"stable">,"detail":"<15 words max>"},
    {"label":"Pipeline Strength","score":<0-100>,"trend":<"up"|"down"|"stable">,"detail":"<15 words max>"},
    {"label":"Cash Flow","score":<0-100>,"trend":<"up"|"down"|"stable">,"detail":"<15 words max>"},
    {"label":"Close Rate","score":<0-100>,"trend":<"up"|"down"|"stable">,"detail":"<15 words max>"},
    {"label":"Operations","score":<0-100>,"trend":<"up"|"down"|"stable">,"detail":"<15 words max>"}
  ]
}`;

  const raw = await claudeComplete(prompt, {
    model: MODELS.sonnet,
    maxTokens: 600,
    system: 'You are a business intelligence scoring system. Return only valid JSON.',
  });

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in health score response');
  return JSON.parse(jsonMatch[0]) as HealthScoreResult;
}

export async function getReorderRecommendations(products: Array<{
  name: string;
  sku: string;
  inStock: number;
  minStock: number;
  unitCost: number;
  unit: string;
  trend: string;
  supplierName: string | null;
}>): Promise<string> {
  const list = products.map((p) =>
    `- ${p.name} (SKU: ${p.sku}): ${p.inStock} ${p.unit} in stock, min ${p.minStock}, trend ${p.trend}, supplier: ${p.supplierName ?? 'unknown'}, unit cost $${p.unitCost}`
  ).join('\n');

  return claudeComplete(
    `You are an inventory manager. Analyze these low/critical stock items and provide specific reorder recommendations:\n\n${list}\n\nFor each item, recommend: quantity to order, urgency level, and which supplier to contact. Format as a bullet list. Be specific with numbers. Keep under 200 words total.`,
    {
      model: MODELS.haiku,
      maxTokens: 350,
      system: 'You are an inventory manager. Give direct, specific reorder recommendations.',
    }
  );
}

export async function draftProposalNarrative(context: {
  businessName: string;
  industry: string;
  packageTier: string;
  lineItems: Array<{ name: string; type: string; price: string }>;
  oneTimeTotal: number;
  monthlyTotal: number;
}): Promise<string> {
  const services = context.lineItems.filter((i) => i.name).map((i) => `${i.name} (${i.type === 'monthly' ? `$${i.price}/mo` : `$${i.price} one-time`})`).join(', ');

  return claudeComplete(
    `Write a professional proposal introduction for a digital marketing agency pitch. Keep it 2-3 short paragraphs.\n\nClient: ${context.businessName} (${context.industry} industry)\nPackage: ${context.packageTier}\nServices proposed: ${services}\nInvestment: ${context.oneTimeTotal > 0 ? `$${context.oneTimeTotal.toLocaleString()} setup` : ''}${context.monthlyTotal > 0 ? ` + $${context.monthlyTotal.toLocaleString()}/month` : ''}\n\nWrite a compelling intro that: acknowledges their industry, explains why these services fit their needs, and positions the investment clearly. No fluff. Sound like a real expert.`,
    {
      model: MODELS.sonnet,
      maxTokens: 400,
      system: 'You write professional B2B sales proposals for a digital marketing agency. Be concise, confident, and industry-specific.',
    }
  );
}

export async function draftPaymentReminder(context: {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  daysOverdue: number;
  contactName: string | null;
}): Promise<string> {
  return claudeComplete(
    `Write a professional payment reminder email for an overdue invoice. Keep it under 100 words.\n\nClient: ${context.clientName}${context.contactName ? ` (contact: ${context.contactName})` : ''}\nInvoice: ${context.invoiceNumber}\nAmount: $${context.amount.toLocaleString()}\nDays overdue: ${context.daysOverdue}\n\nWrite just the email body (no subject line, no signature block). Be polite but direct. Mention the invoice number and amount. Add urgency proportional to how many days overdue. For 1-7 days: friendly reminder. 8-14 days: firmer. 15+ days: serious, mention consequences.`,
    {
      model: MODELS.haiku,
      maxTokens: 200,
      system: 'You write professional payment reminder emails. Be polite but direct. Match tone to urgency.',
    }
  );
}

export async function composeOutreach(context: {
  industry: string;
  businessName: string;
  objective: 'cold_outreach' | 'follow_up' | 'demo_request' | 'check_in';
  type: 'email' | 'sms';
  tone?: 'professional' | 'casual' | 'urgent';
}): Promise<{ subject?: string; body: string }> {
  const objLabel = {
    cold_outreach: 'cold outreach / first touch',
    follow_up:     'follow-up to previous contact',
    demo_request:  'booking a discovery/demo call',
    check_in:      'client check-in to strengthen relationship',
  }[context.objective];

  const tone = context.tone ?? 'professional';
  const isSMS = context.type === 'sms';

  const prompt = isSMS
    ? `Write a short, effective SMS (max 160 chars) for a digital marketing agency to send to ${context.businessName} (${context.industry} business). Objective: ${objLabel}. Tone: ${tone}. Include a clear call to action. Return only the SMS text, no extra commentary.`
    : `Write a ${tone} sales email for a digital marketing agency reaching out to ${context.businessName} (${context.industry} business). Objective: ${objLabel}.

Return ONLY a JSON object with "subject" (string) and "body" (string). The email should be 100-160 words, personalized to the ${context.industry} industry, have a clear value proposition, and end with a single specific call-to-action.`;

  const raw = await claudeComplete(prompt, {
    model:     isSMS ? MODELS.haiku : MODELS.sonnet,
    maxTokens: isSMS ? 200 : 400,
    system:    isSMS
      ? 'You write concise, effective sales SMS messages. Return only the SMS text.'
      : 'You write effective B2B sales emails. Return only valid JSON with subject and body fields.',
  });

  if (isSMS) return { body: raw.trim() };

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { subject: `Grow ${context.businessName} with Digital Marketing`, body: raw };
  try {
    return JSON.parse(match[0]) as { subject: string; body: string };
  } catch {
    return { subject: `Grow ${context.businessName} with Digital Marketing`, body: raw };
  }
}

export interface ScoredAppointment {
  id: string;
  risk: 'high' | 'medium' | 'low';
  reasoning: string;
}

export async function scoreAppointmentRisk(appointments: Array<{
  id: string;
  patient: string;
  service: string;
  time: string;
  durationMin: number;
}>): Promise<ScoredAppointment[]> {
  if (!appointments.length) return [];

  const list = appointments.map((a, i) =>
    `Appointment ${i + 1} (ID: ${a.id}):\nPatient: ${a.patient}\nService: ${a.service}\nTime: ${a.time}\nDuration: ${a.durationMin} min`
  ).join('\n\n---\n\n');

  const prompt = `Score each appointment's no-show risk. Consider: early morning slots, longer duration procedures, service complexity, and typical no-show patterns.

Risk levels:
- high: >40% no-show probability (e.g., early AM, long complex procedure, new patient)
- medium: 15-40% no-show probability (e.g., afternoon, moderate duration)
- low: <15% no-show probability (e.g., established routine, convenient time)

Appointments:
${list}

Return ONLY this JSON array:
[{"id":"<appointment-id>","risk":"<high|medium|low>","reasoning":"<max 8 words>"}]`;

  const raw = await claudeComplete(prompt, {
    model:     MODELS.haiku,
    maxTokens: 400,
    system:    'You are an appointment scheduling risk analyst. Return only valid JSON.',
  });

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return appointments.map((a) => ({ id: a.id, risk: 'low' as const, reasoning: 'Could not score' }));
  try {
    return JSON.parse(match[0]) as ScoredAppointment[];
  } catch {
    return appointments.map((a) => ({ id: a.id, risk: 'low' as const, reasoning: 'Parse error' }));
  }
}

export interface ScoredTask {
  id: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

export async function scoreTaskBatch(tasks: Array<{
  id: string;
  title: string;
  notes: string | null;
  dueDate: string | null;
  linkedType: string | null;
}>): Promise<ScoredTask[]> {
  if (!tasks.length) return [];

  const now = new Date();
  const list = tasks.map((t, i) => {
    const daysUntilDue = t.dueDate
      ? Math.floor((new Date(t.dueDate).getTime() - now.getTime()) / 86400000)
      : null;
    const dueStr = daysUntilDue === null ? 'no due date'
      : daysUntilDue < 0  ? `${Math.abs(daysUntilDue)} days overdue`
      : daysUntilDue === 0 ? 'due today'
      : `due in ${daysUntilDue} days`;
    return `Task ${i + 1} (ID: ${t.id}):\nTitle: ${t.title}\nCategory: ${t.linkedType ?? 'General'}\nDue: ${dueStr}${t.notes ? `\nNotes: ${t.notes.slice(0, 150)}` : ''}`;
  }).join('\n\n---\n\n');

  const prompt = `Score each task's priority for a small business. Return ONLY a JSON array.

Priority levels:
- URGENT: Overdue client-facing deliverables, payments at risk, legal/compliance
- HIGH: Due within 48h, revenue-impacting, or blocking others
- MEDIUM: Due within a week, important but not blocking
- LOW: No deadline, internal admin, optional

Tasks:
${list}

Return this exact JSON array:
[{"id":"<task-id>","priority":"<URGENT|HIGH|MEDIUM|LOW>","reasoning":"<max 8 words>"}]`;

  const raw = await claudeComplete(prompt, {
    model: MODELS.haiku,
    maxTokens: 500,
    system: 'You are a task prioritization system. Return only valid JSON.',
  });

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return tasks.map((t) => ({ id: t.id, priority: 'MEDIUM' as const, reasoning: 'Could not parse' }));
  try {
    return JSON.parse(jsonMatch[0]) as ScoredTask[];
  } catch {
    return tasks.map((t) => ({ id: t.id, priority: 'MEDIUM' as const, reasoning: 'Parse error' }));
  }
}

// ── Streaming ─────────────────────────────────────────────────────────────────

export async function claudeStream(
  prompt: string,
  options: {
    system?: string;
    model?: ClaudeModel;
    maxTokens?: number;
    tools?: Anthropic.Tool[];
  } = {}
): Promise<ReadableStream<Uint8Array>> {
  const { system, model = MODELS.sonnet, maxTokens = 800, tools } = options;
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model,
          max_tokens: maxTokens,
          system: system ?? 'You are a helpful AI assistant.',
          messages: [{ role: 'user', content: prompt }],
          ...(tools && tools.length > 0 ? { tools } : {}),
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'token', text: event.delta.text })}\n\n`
              )
            );
          }
        }

        const finalMsg = await stream.finalMessage();
        let toolName: string | null = null;
        let toolInput: Record<string, unknown> | null = null;

        if (finalMsg.stop_reason === 'tool_use') {
          const toolBlock = finalMsg.content.find((b) => b.type === 'tool_use');
          if (toolBlock && toolBlock.type === 'tool_use') {
            toolName = toolBlock.name;
            toolInput = toolBlock.input as Record<string, unknown>;
          }
        }

        const modelLabel = finalMsg.model?.includes('haiku') ? 'haiku' : 'sonnet';
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'done', toolName, toolInput, model: modelLabel })}\n\n`
          )
        );
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`
          )
        );
        controller.close();
      }
    },
  });
}

export async function getNextBestActions(leads: Array<{
  businessName: string;
  stage: string;
  priority: string;
  daysSinceContact: number;
  estimatedValue: number | null;
  notes: string | null;
}>): Promise<string> {
  const leadSummary = leads.slice(0, 15).map(l =>
    `${l.businessName} — Stage: ${l.stage}, Priority: ${l.priority}, Days since contact: ${l.daysSinceContact}, Value: $${l.estimatedValue ?? 'unknown'}`
  ).join('\n');

  return claudeComplete(
    `Here are the current pipeline leads for a digital marketing agency:\n\n${leadSummary}\n\nIdentify the top 3 leads to contact today. For each, give: the business name, why they should be prioritized, and a specific suggested action (call/email/follow-up on what). Format as a numbered list.`,
    {
      model: MODELS.sonnet,
      maxTokens: 500,
      system: 'You are a sales coach. Analyze pipelines and recommend the highest-value next actions. Be specific and concise.',
    }
  );
}
