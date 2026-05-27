import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  await requireAuth();

  const { searchParams } = new URL(req.url);
  const prospectId = searchParams.get('prospectId');

  if (prospectId) {
    // Detailed activity for one prospect
    const activities = await prisma.prospectActivity.findMany({
      where: { prospectId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Page frequency map
    const pageCounts: Record<string, number> = {};
    for (const a of activities) {
      if (a.type === 'page_view') {
        pageCounts[a.page] = (pageCounts[a.page] || 0) + 1;
      }
    }
    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, count]) => ({ page, count }));

    return NextResponse.json({ activities, topPages });
  }

  // Aggregate stats across all prospects
  const [totalProspects, activeProspects, totalLogins, recentActivity] = await Promise.all([
    prisma.prospectAccount.count(),
    prisma.prospectAccount.count({ where: { isActive: true } }),
    prisma.prospectAccount.aggregate({ _sum: { loginCount: true } }),
    prisma.prospectActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { prospect: { select: { name: true, company: true } } },
    }),
  ]);

  return NextResponse.json({
    totalProspects,
    activeProspects,
    totalLogins: totalLogins._sum.loginCount ?? 0,
    recentActivity,
  });
}
