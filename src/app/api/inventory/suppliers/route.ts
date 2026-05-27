import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supplier = await prisma.supplier.create({ data: body });
  return NextResponse.json(supplier, { status: 201 });
}
