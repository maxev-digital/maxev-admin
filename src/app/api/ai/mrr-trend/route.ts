import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function GET(_req: NextRequest) {
  try {
    await requireAuth();

    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const paidInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidAt: { gte: sixMonthsAgo },
      },
      select: { amount: true, paidAt: true },
    });

    const monthMap: Record<string, number> = {};
    for (const inv of paidInvoices) {
      if (!inv.paidAt) continue;
      const key = `${inv.paidAt.getFullYear()}-${String(inv.paidAt.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = (monthMap[key] ?? 0) + inv.amount;
    }

    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      labels.push(MONTH_NAMES[d.getMonth()]);
      data.push(Math.round(monthMap[key] ?? 0));
    }

    return NextResponse.json({ labels, data, goal: 15000 });
  } catch {
    return NextResponse.json({ labels: [], data: [], goal: 15000 }, { status: 500 });
  }
}
