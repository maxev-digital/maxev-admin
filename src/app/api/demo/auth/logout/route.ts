import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('prospect_session')?.value;

  if (token) {
    await prisma.prospectSession.deleteMany({ where: { token } }).catch(() => {});
    cookieStore.delete('prospect_session');
  }

  return NextResponse.json({ ok: true });
}
