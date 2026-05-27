import { NextRequest, NextResponse } from 'next/server';
import { dfwQuery } from '@/lib/dfwdb';

// Handles both status updates (body.status) and note updates (body.note)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  try {
    if (body.status !== undefined) {
      await dfwQuery(
        `UPDATE businesses SET outreach_status = $1, last_contacted_at = NOW() WHERE id = $2`,
        [body.status, id]
      );
    }
    if (body.note !== undefined) {
      await dfwQuery(
        `UPDATE businesses SET outreach_notes = $1 WHERE id = $2`,
        [body.note, id]
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'DB offline' }, { status: 503 });
  }
}
