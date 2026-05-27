import { NextResponse } from 'next/server';
import { getReorderRecommendations } from '@/lib/claude';
import { prisma } from '@/lib/db';

export async function GET() {
  const lowStock = await prisma.$queryRaw<Array<{
    id: string; name: string; sku: string; inStock: number; minStock: number;
    unitCost: number; unit: string; trend: string; supplierName: string | null;
  }>>`
    SELECT p.id, p.name, p.sku, p."inStock", p."minStock", p."unitCost", p.unit, p.trend,
           s.name AS "supplierName"
    FROM products p
    LEFT JOIN suppliers s ON p."supplierId" = s.id
    WHERE p."inStock" <= p."minStock"
    ORDER BY (p."inStock"::float / NULLIF(p."minStock", 0)) ASC
    LIMIT 10
  `;

  if (!lowStock.length) {
    return NextResponse.json({ recommendations: 'All stock levels are healthy — no reorders needed at this time.', count: 0 });
  }

  let recommendations = '';
  try {
    recommendations = await getReorderRecommendations(lowStock.map((p) => ({
      name: p.name, sku: p.sku, inStock: p.inStock, minStock: p.minStock,
      unitCost: p.unitCost, unit: p.unit, trend: p.trend, supplierName: p.supplierName,
    })));
  } catch {
    recommendations = `${lowStock.length} item${lowStock.length !== 1 ? 's' : ''} need reordering: ${lowStock.map((p) => `${p.name} (${p.inStock} remaining, min ${p.minStock})`).join('; ')}`;
  }

  return NextResponse.json({ recommendations, count: lowStock.length, items: lowStock.map((p) => p.name) });
}
