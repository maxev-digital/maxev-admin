import { NextRequest, NextResponse } from 'next/server';
import { composeOutreach } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { industry, businessName, objective, type, tone } = await req.json();

  if (!industry || !businessName || !objective || !type) {
    return NextResponse.json({ error: 'industry, businessName, objective, type required' }, { status: 400 });
  }

  const result = await composeOutreach({ industry, businessName, objective, type, tone });
  return NextResponse.json(result);
}
