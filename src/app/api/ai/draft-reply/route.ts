import { NextRequest, NextResponse } from 'next/server';
import { draftTicketReply } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { subject, body, businessContext } = await req.json();
  if (!subject || !body) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  try {
    const draft = await draftTicketReply(subject, body, businessContext ?? 'Small business customer support');
    return NextResponse.json({ draft });
  } catch (err) {
    console.error('AI draft reply error:', err);
    return NextResponse.json({ error: 'AI unavailable' }, { status: 500 });
  }
}
