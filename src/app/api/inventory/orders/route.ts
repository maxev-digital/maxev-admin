import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { orderDate: 'desc' },
    include: {
      supplier: { select: { name: true } },
      items: { include: { product: { select: { name: true, unitCost: true } } } },
    },
  });

  const enriched = orders.map((o) => ({
    id:            o.id,
    orderNumber:   o.orderNumber,
    supplierName:  o.supplier.name,
    status:        o.status.toLowerCase().replace('_', '-'),
    orderDate:     o.orderDate.toISOString(),
    expectedDate:  o.expectedDate?.toISOString() ?? null,
    receivedDate:  o.receivedDate?.toISOString() ?? null,
    total:         o.items.reduce((s, i) => s + i.quantity * i.unitCost, 0),
    items:         o.items.map((i) => `${i.product.name} x${i.quantity}`),
    notes:         o.notes,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const { supplierId, items, notes, expectedDate } = await req.json();
  if (!supplierId || !items?.length) {
    return NextResponse.json({ error: 'supplierId and items required' }, { status: 400 });
  }

  const count = await prisma.purchaseOrder.count();
  const orderNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId,
      orderNumber,
      status:       'PENDING',
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      notes:        notes?.trim() || null,
      items: {
        create: items.map((it: { productId: string; quantity: number; unitCost: number }) => ({
          productId: it.productId,
          quantity:  it.quantity,
          unitCost:  it.unitCost,
        })),
      },
    },
    include: {
      supplier: { select: { name: true } },
      items:    { include: { product: { select: { name: true } } } },
    },
  });

  return NextResponse.json(order, { status: 201 });
}
