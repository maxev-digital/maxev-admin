import { NextResponse } from 'next/server';
import { revokeConnection } from '@/lib/google-calendar';

export async function POST() {
  await revokeConnection('default');
  return NextResponse.json({ ok: true });
}
