import { NextResponse } from 'next/server';
import { isConnected } from '@/lib/google-calendar';

export async function GET() {
  const [gcalConnected] = await Promise.all([
    isConnected('default').catch(() => false),
  ]);

  return NextResponse.json({
    stripe:         !!process.env.STRIPE_SECRET_KEY,
    twilio:         !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    smtp:           !!(process.env.SMTP_HOST && process.env.SMTP_PASS),
    anthropic:      !!process.env.ANTHROPIC_API_KEY,
    googleCalendar: gcalConnected,
    googleClientId: !!process.env.GOOGLE_CLIENT_ID,
  });
}
