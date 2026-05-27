import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, saveTokens } from '@/lib/google-calendar';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/system/integrations?gcal=error', req.url),
    );
  }

  try {
    const tokens = await exchangeCode(code);
    await saveTokens('default', tokens.access_token, tokens.refresh_token ?? null, tokens.expires_in);
    return NextResponse.redirect(
      new URL('/system/integrations?gcal=connected', req.url),
    );
  } catch (err) {
    console.error('[gcal callback]', err);
    return NextResponse.redirect(
      new URL('/system/integrations?gcal=error', req.url),
    );
  }
}
