import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function computeStatus(endDate: Date): string {
  const now = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
  if (endDate < now)   return 'EXPIRED';
  if (daysLeft <= 30)  return 'EXPIRING_SOON';
  return 'ACTIVE';
}

export async function GET() {
  const contracts = await prisma.contract.findMany({ orderBy: { startDate: 'desc' } });
  // Auto-compute status based on endDate
  const enriched = contracts.map((c) => ({
    ...c,
    status: c.status === 'DRAFT' ? 'DRAFT' : computeStatus(c.endDate),
  }));
  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const { clientName, serviceName, startDate, endDate, monthlyValue, notes } = await req.json();
  if (!clientName?.trim() || !serviceName?.trim() || !startDate || !endDate || !monthlyValue) {
    return NextResponse.json({ error: 'clientName, serviceName, startDate, endDate, monthlyValue required' }, { status: 400 });
  }
  const end = new Date(endDate);
  const status = computeStatus(end);
  const contract = await prisma.contract.create({
    data: {
      clientName:   clientName.trim(),
      serviceName:  serviceName.trim(),
      startDate:    new Date(startDate),
      endDate:      end,
      monthlyValue: parseFloat(monthlyValue),
      status:       status as 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'DRAFT',
      notes:        notes?.trim() || null,
    },
  });
  return NextResponse.json(contract, { status: 201 });
}
