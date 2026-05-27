import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface ServiceResult {
  name: string;
  status: 'ok' | 'error' | 'unconfigured';
  latencyMs?: number;
  detail?: string;
}

function withTimeout<T>(promise: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

async function checkDatabase(): Promise<ServiceResult> {
  const t = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`);
    return { name: 'Database (PostgreSQL)', status: 'ok', latencyMs: Date.now() - t };
  } catch (err) {
    return { name: 'Database (PostgreSQL)', status: 'error', detail: String(err) };
  }
}

async function checkSMTP(): Promise<ServiceResult> {
  const t = Date.now();
  const host = process.env.SMTP_HOST;
  const pass = process.env.SMTP_PASS;
  const user = process.env.SMTP_USER_INFO;
  if (!host || !pass) return { name: 'SMTP (Hostinger)', status: 'unconfigured', detail: 'SMTP_HOST or SMTP_PASS not set' };
  try {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.default.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: { user, pass },
    });
    await withTimeout(transport.verify() as Promise<boolean>);
    return { name: 'SMTP (Hostinger)', status: 'ok', latencyMs: Date.now() - t };
  } catch (err) {
    return { name: 'SMTP (Hostinger)', status: 'error', detail: String(err) };
  }
}

async function checkAnthropic(): Promise<ServiceResult> {
  const t = Date.now();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { name: 'Anthropic AI', status: 'unconfigured', detail: 'ANTHROPIC_API_KEY not set' };
  try {
    const res = await withTimeout(fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    }));
    if (res.status === 401) return { name: 'Anthropic AI', status: 'error', detail: 'Invalid API key' };
    if (!res.ok && res.status !== 200) {
      const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
      return { name: 'Anthropic AI', status: 'error', detail: body.error?.message ?? `HTTP ${res.status}` };
    }
    return { name: 'Anthropic AI', status: 'ok', latencyMs: Date.now() - t };
  } catch (err) {
    return { name: 'Anthropic AI', status: 'error', detail: String(err) };
  }
}

async function checkTwilio(): Promise<ServiceResult> {
  const t = Date.now();
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return { name: 'Twilio SMS', status: 'unconfigured', detail: 'TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set' };
  try {
    const res = await withTimeout(fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
    }));
    const data = await res.json() as { status?: string; friendly_name?: string; message?: string };
    if (!res.ok) return { name: 'Twilio SMS', status: 'error', detail: data.message ?? 'Auth failed' };
    return { name: 'Twilio SMS', status: 'ok', latencyMs: Date.now() - t, detail: data.friendly_name ?? data.status };
  } catch (err) {
    return { name: 'Twilio SMS', status: 'error', detail: String(err) };
  }
}

async function checkStripe(): Promise<ServiceResult> {
  const t = Date.now();
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { name: 'Stripe', status: 'unconfigured', detail: 'STRIPE_SECRET_KEY not set' };
  try {
    const res = await withTimeout(fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
    }));
    if (!res.ok) {
      const data = await res.json() as { error?: { message?: string } };
      return { name: 'Stripe', status: 'error', detail: data.error?.message ?? 'Auth failed' };
    }
    return { name: 'Stripe', status: 'ok', latencyMs: Date.now() - t };
  } catch (err) {
    return { name: 'Stripe', status: 'error', detail: String(err) };
  }
}

async function checkGoogleCalendar(): Promise<ServiceResult> {
  const id     = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) return { name: 'Google Calendar', status: 'unconfigured', detail: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set' };
  return { name: 'Google Calendar', status: 'ok', detail: 'OAuth credentials configured' };
}

async function checkRedis(): Promise<ServiceResult> {
  const t   = Date.now();
  const url = process.env.REDIS_URL;
  if (!url) return { name: 'Redis', status: 'unconfigured', detail: 'REDIS_URL not set' };
  try {
    const { hostname, port } = new URL(url);
    const portNum = parseInt(port || '6379');
    await withTimeout(new Promise<void>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const net = require('net') as typeof import('net');
      const socket = net.createConnection({ host: hostname, port: portNum });
      socket.on('connect', () => { socket.destroy(); resolve(); });
      socket.on('error', (e) => reject(e));
    }));
    return { name: 'Redis', status: 'ok', latencyMs: Date.now() - t };
  } catch (err) {
    return { name: 'Redis', status: 'error', detail: String(err) };
  }
}

async function checkGoogleAnalytics(): Promise<ServiceResult> {
  const id = process.env.GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_ID;
  if (!id) return { name: 'Google Analytics', status: 'unconfigured', detail: 'GA_MEASUREMENT_ID not set' };
  return { name: 'Google Analytics', status: 'ok', detail: `Tracking ID: ${id}` };
}

async function checkZapier(): Promise<ServiceResult> {
  const webhook = process.env.ZAPIER_WEBHOOK_URL;
  if (!webhook) return { name: 'Zapier', status: 'unconfigured', detail: 'ZAPIER_WEBHOOK_URL not set' };
  return { name: 'Zapier', status: 'ok', detail: 'Webhook URL configured' };
}

export async function GET() {
  const results = await Promise.allSettled([
    checkDatabase(),
    checkSMTP(),
    checkAnthropic(),
    checkTwilio(),
    checkStripe(),
    checkGoogleCalendar(),
    checkRedis(),
    checkGoogleAnalytics(),
    checkZapier(),
  ]);

  const services: ServiceResult[] = results.map((r, i) => {
    const fallbackNames = [
      'Database (PostgreSQL)', 'SMTP (Hostinger)', 'Anthropic AI',
      'Twilio SMS', 'Stripe', 'Google Calendar',
      'Redis', 'Google Analytics', 'Zapier',
    ];
    if (r.status === 'fulfilled') return r.value;
    return { name: fallbackNames[i], status: 'error' as const, detail: String((r as PromiseRejectedResult).reason) };
  });

  const errors    = services.filter(s => s.status === 'error').length;
  const unconfigured = services.filter(s => s.status === 'unconfigured').length;
  const overall   = errors > 0 ? 'degraded' : unconfigured > 0 ? 'partial' : 'ok';

  return NextResponse.json({ overall, checkedAt: new Date().toISOString(), services });
}
