import { NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/google-calendar';

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI env vars are required' },
      { status: 503 },
    );
  }

  const url = buildAuthUrl('maxev-admin');
  return NextResponse.redirect(url);
}
