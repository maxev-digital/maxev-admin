import { NextResponse } from 'next/server';
import { isConnected } from '@/lib/google-calendar';
import { prisma } from '@/lib/db';

export async function GET() {
  const connected = await isConnected('default');
  if (!connected) return NextResponse.json({ connected: false });

  const row = await prisma.googleCalendarToken.findUnique({ where: { orgId: 'default' } });
  return NextResponse.json({
    connected:  true,
    calendarId: row?.calendarId ?? 'primary',
    expiresAt:  row?.expiresAt,
  });
}
