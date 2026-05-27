import { NextResponse } from 'next/server';
import { listUpcomingEvents } from '@/lib/google-calendar';

export async function GET() {
  const events = await listUpcomingEvents('default', 30);
  return NextResponse.json(events);
}
