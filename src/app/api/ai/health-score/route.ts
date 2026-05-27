import { NextResponse } from 'next/server';
import { getBusinessHealthScore } from '@/lib/claude';
import { prisma } from '@/lib/db';

export async function GET() {
  const now      = new Date();
  const q90ago   = new Date(now); q90ago.setDate(q90ago.getDate() - 90);
  const q180ago  = new Date(now); q180ago.setDate(q180ago.getDate() - 180);

  const [
    invoicesPaidThisQ,
    invoicesPaidLastQ,
    activeClients,
    churnedClients,
    pipelineLeads,
    overdueInvoices,
    proposalsSent,
    proposalsSigned,
    openTickets,
    urgentTickets,
    tasksDueToday,
    tasksOverdue,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: 'PAID', paidAt: { gte: q90ago } },
      select: { amount: true },
    }),
    prisma.invoice.findMany({
      where: { status: 'PAID', paidAt: { gte: q180ago, lt: q90ago } },
      select: { amount: true },
    }),
    prisma.client.count({ where: { status: 'ACTIVE' } }),
    prisma.client.count({ where: { status: 'CHURNED', updatedAt: { gte: q90ago } } }),
    prisma.lead.findMany({
      where: { stage: { notIn: ['LIVE', 'ON_RETAINER', 'DEAD'] } },
      select: { estimatedValue: true, priority: true },
    }),
    prisma.invoice.findMany({
      where: { status: 'OVERDUE' },
      select: { amount: true },
    }),
    prisma.proposal.count({ where: { status: { in: ['SENT', 'VIEWED', 'SIGNED', 'DECLINED'] }, createdAt: { gte: q90ago } } }),
    prisma.proposal.count({ where: { status: 'SIGNED', createdAt: { gte: q90ago } } }),
    prisma.ticket.count({ where: { status: 'OPEN' } }),
    prisma.ticket.count({ where: { status: 'URGENT' } }),
    prisma.task.count({ where: { status: { not: 'DONE' }, dueDate: { gte: new Date(now.toDateString()), lt: new Date(new Date(now.toDateString()).getTime() + 86400000) } } }),
    prisma.task.count({ where: { status: { not: 'DONE' }, dueDate: { lt: new Date(now.toDateString()) } } }),
  ]);

  const revenueThisQ   = invoicesPaidThisQ.reduce((s, i) => s + i.amount, 0);
  const revenueLastQ   = invoicesPaidLastQ.reduce((s, i) => s + i.amount, 0);
  const pipelineValue  = pipelineLeads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
  const hotLeads       = pipelineLeads.filter((l) => l.priority === 'HOT').length;
  const overdueAmount  = overdueInvoices.reduce((s, i) => s + i.amount, 0);

  let result;
  try {
    result = await getBusinessHealthScore({
      revenueThisQuarter: revenueThisQ,
      revenueLastQuarter: revenueLastQ,
      activeClients,
      churnedLast90: churnedClients,
      pipelineValue,
      hotLeads,
      overdueInvoices: overdueInvoices.length,
      overdueAmount,
      proposalsSent,
      proposalsSigned,
      openTickets,
      urgentTickets,
      tasksDueToday,
      tasksOverdue,
    });
  } catch {
    // Fallback: compute scores mathematically if Claude unavailable
    const revenueScore  = revenueLastQ === 0 ? 70 : Math.min(100, Math.round((revenueThisQ / revenueLastQ) * 70));
    const retentionScore = Math.max(0, 100 - churnedClients * 20);
    const pipelineScore  = pipelineValue > 50000 ? 90 : Math.round((pipelineValue / 50000) * 90);
    const cashScore      = overdueInvoices.length === 0 ? 95 : Math.max(0, 95 - overdueInvoices.length * 15);
    const closeScore     = proposalsSent === 0 ? 70 : Math.round((proposalsSigned / proposalsSent) * 100);
    const opsScore       = Math.max(0, 100 - tasksOverdue * 8 - urgentTickets * 10);
    const overall        = Math.round((revenueScore + retentionScore + pipelineScore + cashScore + closeScore + opsScore) / 6);
    const grade          = overall >= 93 ? 'A+' : overall >= 87 ? 'A' : overall >= 80 ? 'B+' : overall >= 73 ? 'B' : overall >= 67 ? 'C+' : overall >= 60 ? 'C' : overall >= 50 ? 'D' : 'F';

    result = {
      overall, grade,
      summary: `Business is operating at ${overall}% health based on current pipeline, revenue, and operations.`,
      dimensions: [
        { label: 'Revenue Growth',   score: revenueScore,   trend: revenueThisQ >= revenueLastQ ? 'up' : 'down' as const, detail: `$${revenueThisQ.toLocaleString()} this quarter` },
        { label: 'Client Retention', score: retentionScore, trend: churnedClients === 0 ? 'stable' : 'down' as const,    detail: `${activeClients} active clients` },
        { label: 'Pipeline Strength',score: pipelineScore,  trend: hotLeads > 2 ? 'up' : 'stable' as const,              detail: `$${pipelineValue.toLocaleString()} pipeline value` },
        { label: 'Cash Flow',        score: cashScore,      trend: overdueInvoices.length === 0 ? 'up' : 'down' as const, detail: `${overdueInvoices.length} overdue invoices` },
        { label: 'Close Rate',       score: closeScore,     trend: 'stable' as const,                                    detail: `${proposalsSigned}/${proposalsSent} proposals signed` },
        { label: 'Operations',       score: opsScore,       trend: tasksOverdue === 0 ? 'stable' : 'down' as const,      detail: `${tasksOverdue} overdue tasks` },
      ],
    };
  }

  return NextResponse.json({ ...result, generatedAt: now.toISOString() });
}
