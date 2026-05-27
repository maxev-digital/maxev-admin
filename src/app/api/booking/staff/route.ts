import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const staff = await prisma.staff.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const member = await prisma.staff.create({ data: body });
  return NextResponse.json(member, { status: 201 });
}
