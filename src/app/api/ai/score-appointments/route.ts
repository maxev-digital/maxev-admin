import { NextRequest, NextResponse } from 'next/server';
import { scoreAppointmentRisk } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { appointments } = await req.json();

  if (!Array.isArray(appointments) || !appointments.length) {
    return NextResponse.json({ error: 'appointments array required' }, { status: 400 });
  }

  const scored = await scoreAppointmentRisk(appointments);
  return NextResponse.json(scored);
}
