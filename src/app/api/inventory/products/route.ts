import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const products = await prisma.product.findMany({
    include: { supplier: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const product = await prisma.product.create({ data: body });
  return NextResponse.json(product, { status: 201 });
}
