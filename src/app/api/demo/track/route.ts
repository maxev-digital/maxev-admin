import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('prospect_session')?.value;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const session = await prisma.prospectSession.findUnique({
    where: { token },
    select: { id: true, prospectId: true, expiresAt: true },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { type, page, action, metadata } = await req.json();
  if (!type || !page) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.prospectActivity.create({
    data: {
      prospectId: session.prospectId,
      sessionId: session.id,
      type,
      page,
      action: action || null,
      metadata: metadata || null,
    },
  });

  return NextResponse.json({ ok: true });
}
