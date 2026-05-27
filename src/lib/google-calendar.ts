import { prisma } from './db';

const GOOGLE_AUTH_URL   = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL  = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const CALENDAR_API      = 'https://www.googleapis.com/calendar/v3';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

function clientId()     { return process.env.GOOGLE_CLIENT_ID ?? ''; }
function clientSecret() { return process.env.GOOGLE_CLIENT_SECRET ?? ''; }
function redirectUri()  { return process.env.GOOGLE_REDIRECT_URI ?? ''; }

// ─── OAuth helpers ────────────────────────────────────────────────────────────

export function buildAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id:     clientId(),
    redirect_uri:  redirectUri(),
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
    ...(state ? { state } : {}),
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCode(code: string): Promise<{
  access_token: string; refresh_token?: string; expires_in: number;
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId(),
      client_secret: clientSecret(),
      redirect_uri:  redirectUri(),
      grant_type:    'authorization_code',
    }).toString(),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string; expires_in: number;
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     clientId(),
      client_secret: clientSecret(),
      grant_type:    'refresh_token',
    }).toString(),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json();
}

// ─── Token storage ────────────────────────────────────────────────────────────

export async function saveTokens(
  orgId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number,
) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000 - 60_000);
  await prisma.googleCalendarToken.upsert({
    where:  { orgId },
    create: { orgId, accessToken, refreshToken: refreshToken ?? undefined, expiresAt },
    update: { accessToken, expiresAt, ...(refreshToken ? { refreshToken } : {}) },
  });
}

export async function getValidToken(orgId = 'default'): Promise<string | null> {
  const row = await prisma.googleCalendarToken.findUnique({ where: { orgId } });
  if (!row) return null;

  if (row.expiresAt > new Date()) return row.accessToken;

  if (!row.refreshToken) return null;

  try {
    const data = await refreshAccessToken(row.refreshToken);
    const expiresAt = new Date(Date.now() + data.expires_in * 1000 - 60_000);
    await prisma.googleCalendarToken.update({
      where: { orgId },
      data:  { accessToken: data.access_token, expiresAt },
    });
    return data.access_token;
  } catch {
    return null;
  }
}

export async function isConnected(orgId = 'default'): Promise<boolean> {
  const row = await prisma.googleCalendarToken.findUnique({ where: { orgId } });
  return !!row;
}

export async function revokeConnection(orgId = 'default'): Promise<void> {
  const row = await prisma.googleCalendarToken.findUnique({ where: { orgId } });
  if (row?.refreshToken) {
    fetch(GOOGLE_REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `token=${row.refreshToken}`,
    }).catch(() => {});
  }
  await prisma.googleCalendarToken.delete({ where: { orgId } }).catch(() => {});
}

// ─── Calendar event helpers ───────────────────────────────────────────────────

export interface CalendarEventInput {
  summary:      string;
  description?: string;
  startTime:    Date;
  durationMin:  number;
  location?:    string;
  attendees?:   string[];
}

export async function createCalendarEvent(
  input: CalendarEventInput,
  orgId = 'default',
): Promise<string | null> {
  const token = await getValidToken(orgId);
  if (!token) return null;

  const row = await prisma.googleCalendarToken.findUnique({ where: { orgId } });
  const calendarId = row?.calendarId ?? 'primary';

  const endTime = new Date(input.startTime.getTime() + input.durationMin * 60_000);

  const body: Record<string, unknown> = {
    summary:     input.summary,
    description: input.description ?? '',
    start:       { dateTime: input.startTime.toISOString(), timeZone: 'UTC' },
    end:         { dateTime: endTime.toISOString(),         timeZone: 'UTC' },
  };
  if (input.location)  body.location  = input.location;
  if (input.attendees?.length) {
    body.attendees = input.attendees.map((email) => ({ email }));
  }

  const res = await fetch(`${CALENDAR_API}/calendars/${calendarId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error('[gcal] create event failed:', res.status, await res.text());
    return null;
  }

  const event = await res.json();
  return event.id as string;
}

export async function updateCalendarEvent(
  eventId:    string,
  input:      Partial<CalendarEventInput>,
  orgId = 'default',
): Promise<boolean> {
  const token = await getValidToken(orgId);
  if (!token) return false;

  const row = await prisma.googleCalendarToken.findUnique({ where: { orgId } });
  const calendarId = row?.calendarId ?? 'primary';

  const patch: Record<string, unknown> = {};
  if (input.summary)     patch.summary     = input.summary;
  if (input.description) patch.description = input.description;
  if (input.location)    patch.location    = input.location;
  if (input.startTime) {
    const endTime = new Date(input.startTime.getTime() + (input.durationMin ?? 60) * 60_000);
    patch.start = { dateTime: input.startTime.toISOString(), timeZone: 'UTC' };
    patch.end   = { dateTime: endTime.toISOString(),         timeZone: 'UTC' };
  }

  const res = await fetch(`${CALENDAR_API}/calendars/${calendarId}/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });

  return res.ok;
}

export async function deleteCalendarEvent(
  eventId: string,
  orgId = 'default',
): Promise<boolean> {
  const token = await getValidToken(orgId);
  if (!token) return false;

  const row = await prisma.googleCalendarToken.findUnique({ where: { orgId } });
  const calendarId = row?.calendarId ?? 'primary';

  const res = await fetch(`${CALENDAR_API}/calendars/${calendarId}/events/${eventId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  return res.status === 204 || res.ok;
}

export async function listUpcomingEvents(orgId = 'default', maxResults = 20): Promise<unknown[]> {
  const token = await getValidToken(orgId);
  if (!token) return [];

  const row = await prisma.googleCalendarToken.findUnique({ where: { orgId } });
  const calendarId = row?.calendarId ?? 'primary';

  const params = new URLSearchParams({
    timeMin:    new Date().toISOString(),
    maxResults: String(maxResults),
    singleEvents: 'true',
    orderBy:    'startTime',
  });

  const res = await fetch(`${CALENDAR_API}/calendars/${calendarId}/events?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}
