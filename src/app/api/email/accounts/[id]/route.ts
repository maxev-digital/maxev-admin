import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.label    !== undefined) data.label    = body.label;
    if (body.imapHost !== undefined) data.imapHost = body.imapHost;
    if (body.imapPort !== undefined) data.imapPort = body.imapPort;
    if (body.imapPass !== undefined) data.imapPass = body.imapPass;
    if (body.smtpHost !== undefined) data.smtpHost = body.smtpHost;
    if (body.smtpPort !== undefined) data.smtpPort = body.smtpPort;
    if (body.smtpPass !== undefined) data.smtpPass = body.smtpPass;
    if (body.fromName !== undefined) data.fromName = body.fromName;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const account = await prisma.emailAccount.update({ where: { id }, data });
    return NextResponse.json(account);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    await prisma.emailAccount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
