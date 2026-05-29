import { NextResponse } from 'next/server';
import { getDailyBriefing } from '@/lib/claude';
import { prisma } from '@/lib/db';

export async function GET() {
  const today    = new Date(new Date().toDateString());
  const tomorrow = new Date(today.getTime() + 86400000);

  const [
    activeClients, openLeads, overdueInvoices, hotLeads, expiringProposals,
    openTickets, urgentTickets, tasksOverdue, tasksDueToday, upcomingAppointments, criticalStock,
  ] = await Promise.all([
    prisma.client.count({ where: { status: 'ACTIVE' } }),
    prisma.lead.findMany({
      where: { stage: { notIn: ['LIVE', 'ON_RETAINER', 'DEAD'] } },
      select: { businessName: true, estimatedValue: true },
      take: 100,
    }),
    prisma.invoice.findMany({ where: { status: 'OVERDUE' }, select: { amount: true }, take: 50 }),
    prisma.lead.findMany({
      where: { priority: 'HOT', stage: { notIn: ['LIVE', 'ON_RETAINER', 'DEAD'] } },
      select: { businessName: true }, take: 5,
    }),
    prisma.proposal.findMany({
      where: { status: 'SENT', expiresAt: { lte: new Date(Date.now() + 7 * 86400000) } },
      select: { businessName: true }, take: 5,
    }),
    prisma.ticket.count({ where: { status: 'OPEN' } }),
    prisma.ticket.count({ where: { status: 'URGENT' } }),
    prisma.task.count({ where: { status: { not: 'DONE' }, dueDate: { lt: today } } }),
    prisma.task.count({ where: { status: { not: 'DONE' }, dueDate: { gte: today, lt: tomorrow } } }),
    prisma.appointment.count({ where: { startTime: { gte: new Date(), lt: tomorrow }, status: 'CONFIRMED' } }),
    prisma.$queryRaw<[{count: bigint}]>`SELECT COUNT(*)::int FROM products WHERE "inStock" <= "minStock"`.then((r) => Number(r[0]?.count ?? 0)).catch(() => 0),
  ]);

  const overdueAmount     = overdueInvoices.reduce((s, i) => s + i.amount, 0);
  const openPipelineValue = openLeads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);

  let briefing = '';
  try {
    briefing = await getDailyBriefing({
      activeClients,
      openLeads: openLeads.length,
      overdueInvoices: overdueInvoices.length,
      overdueAmount,
      upcomingDemos: upcomingAppointments,
      hotLeads: hotLeads.map((l) => l.businessName),
      expiringProposals: expiringProposals.map((p) => p.businessName),
      openTickets,
      urgentTickets,
      tasksOverdue,
      tasksDueToday,
      criticalStock: Number(criticalStock),
    });
  } catch {
    // AI engine unavailable — vitals still return
  }

  return NextResponse.json({
    briefing,
    vitals: {
      activeClients,
      openLeads: openLeads.length,
      overdueInvoices: overdueInvoices.length,
      overdueAmount,
      openPipelineValue,
      hotLeads: hotLeads.length,
      expiringProposals: expiringProposals.length,
      openTickets,
      urgentTickets,
    },
  });
}
