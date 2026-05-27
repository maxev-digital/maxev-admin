import { prisma } from './db';

export function isImapConfigured(): boolean {
  // True if env vars set OR at least one active DB account with credentials
  return !!(process.env.IMAP_HOST && process.env.IMAP_USER);
}

export async function hasAnyAccount(): Promise<boolean> {
  const count = await prisma.emailAccount.count({ where: { isActive: true } });
  return count > 0;
}

function parseAddresses(raw: unknown): string {
  if (!raw) return '[]';
  try {
    const val = (raw as any).value ?? raw;
    if (Array.isArray(val)) return JSON.stringify(val.map((a: any) => ({ name: a.name || '', address: (a.address || '').toLowerCase() })));
  } catch { /* ignore */ }
  return '[]';
}

async function matchContact(addresses: string[]) {
  const addrs = addresses.filter(Boolean).map((a) => a.toLowerCase());
  const lead = await prisma.lead.findFirst({ where: { email: { in: addrs } }, select: { id: true } });
  if (lead) return { leadId: lead.id, clientId: null };
  const client = await prisma.client.findFirst({ where: { email: { in: addrs } }, select: { id: true } });
  return { leadId: null, clientId: client?.id ?? null };
}

async function syncFolder(
  imapFlow: InstanceType<(typeof import('imapflow'))['ImapFlow']>,
  accountId: string,
  folderName: string,
  lastUid: number,
  isSent: boolean,
): Promise<{ count: number; maxUid: number }> {
  const lock = await imapFlow.getMailboxLock(folderName);
  let count = 0;
  let maxUid = lastUid;

  try {
    const query = lastUid > 0
      ? `${lastUid + 1}:*`
      : { since: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };

    for await (const msg of imapFlow.fetch(query as any, { uid: true, source: true, flags: true }, { uid: lastUid > 0 })) {
      if (!msg.source) continue;
      try {
        const { simpleParser } = await import('mailparser');
        const parsed = await simpleParser(msg.source as Buffer);

        const messageId: string = (parsed.messageId as string) || `local-${accountId}-${msg.uid}-${Date.now()}`;
        const fromEmail: string = ((parsed.from as any)?.value?.[0]?.address || '').toLowerCase();
        const fromName: string  = (parsed.from as any)?.value?.[0]?.name || '';
        const subject: string   = (parsed.subject as string) || '(no subject)';
        const toRaw             = parseAddresses(parsed.to);
        const ccRaw             = parsed.cc ? parseAddresses(parsed.cc) : null;

        const inReplyTo: string | null  = (parsed.inReplyTo as string) || null;
        const refs: string[]            = Array.isArray(parsed.references) ? parsed.references as string[] : [];
        const references: string | null = refs.length > 0 ? refs.join(' ') : null;
        const threadId: string          = refs[0] || inReplyTo || messageId;

        const toAddrs: string[] = JSON.parse(toRaw).map((a: any) => a.address || '');
        const allAddrs          = isSent ? toAddrs : [fromEmail];
        const { leadId, clientId } = await matchContact(allAddrs);

        const bodyText: string = (parsed.text as string) || '';
        const snippet: string  = bodyText.replace(/\s+/g, ' ').slice(0, 220).trim();

        const rawAttachments = (parsed.attachments || []) as Array<{ filename?: string; contentType: string; size?: number }>;
        const attachments = rawAttachments.map((a) => ({
          filename:    a.filename || 'attachment',
          contentType: a.contentType,
          size:        a.size || 0,
        }));

        const isRead = isSent ? true : (msg.flags ? [...(msg.flags as Set<string>)].includes('\\Seen') : false);

        await prisma.emailMessage.upsert({
          where: { messageId },
          create: {
            accountId,
            messageId,
            uid:          msg.uid,
            folder:       folderName,
            subject,
            fromEmail,
            fromName,
            toRaw,
            ccRaw,
            bodyHtml:     (parsed.html as string) || null,
            bodyText:     bodyText || null,
            snippet,
            isRead,
            isSent,
            threadId,
            inReplyTo,
            references,
            hasAttachment: attachments.length > 0,
            attachments:   attachments.length > 0 ? attachments : undefined,
            receivedAt:    (parsed.date as Date) || new Date(),
            leadId,
            clientId,
          },
          update: { isRead, snippet: snippet || undefined },
        });

        if (msg.uid > maxUid) maxUid = msg.uid;
        count++;
      } catch (e) {
        console.error('[imap-sync] parse error uid=' + msg.uid, e);
      }
    }
  } finally {
    lock.release();
  }

  return { count, maxUid };
}

async function syncOneAccount(acct: {
  id: string; email: string; imapHost: string; imapPort: number; imapPass: string;
  lastInboxUid: number; lastSentUid: number;
}): Promise<{ synced: number; error?: string }> {
  const { ImapFlow } = await import('imapflow');
  const client = new ImapFlow({
    host: acct.imapHost,
    port: acct.imapPort,
    secure: true,
    auth: { user: acct.email, pass: acct.imapPass },
    logger: false,
    tls: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    let synced = 0;

    const inbox = await syncFolder(client, acct.id, 'INBOX', acct.lastInboxUid, false);
    synced += inbox.count;
    if (inbox.maxUid > acct.lastInboxUid) {
      await prisma.emailAccount.update({ where: { id: acct.id }, data: { lastInboxUid: inbox.maxUid } });
    }

    for (const sentName of ['Sent', 'Sent Messages', 'Sent Items', '[Gmail]/Sent Mail']) {
      try {
        const sent = await syncFolder(client, acct.id, sentName, acct.lastSentUid, true);
        synced += sent.count;
        if (sent.maxUid > acct.lastSentUid) {
          await prisma.emailAccount.update({ where: { id: acct.id }, data: { lastSentUid: sent.maxUid } });
        }
        break;
      } catch { /* folder not found */ }
    }

    await prisma.emailAccount.update({ where: { id: acct.id }, data: { lastSyncAt: new Date() } });
    await client.logout();
    return { synced };
  } catch (err) {
    try { await client.logout(); } catch { /* ignore */ }
    return { synced: 0, error: err instanceof Error ? err.message : 'IMAP sync failed' };
  }
}

// Sync a specific account by ID, or all active accounts if no ID given
export async function syncEmails(accountId?: string): Promise<{ synced: number; error?: string; results?: Array<{ email: string; synced: number; error?: string }> }> {
  const where = accountId
    ? { id: accountId, isActive: true }
    : { isActive: true };

  const accounts = await prisma.emailAccount.findMany({
    where,
    select: { id: true, email: true, imapHost: true, imapPort: true, imapPass: true, lastInboxUid: true, lastSentUid: true },
  });

  // Fallback: if no DB accounts, try env vars
  if (accounts.length === 0 && isImapConfigured()) {
    const envAcct = await prisma.emailAccount.upsert({
      where: { email: process.env.IMAP_USER! },
      create: {
        label: 'Admin Inbox',
        email: process.env.IMAP_USER!,
        imapHost: process.env.IMAP_HOST || 'imap.hostinger.com',
        imapPort: parseInt(process.env.IMAP_PORT || '993'),
        imapPass: process.env.IMAP_PASS || process.env.SMTP_PASS || '',
        smtpHost: process.env.SMTP_HOST || 'smtp.hostinger.com',
        smtpPort: parseInt(process.env.SMTP_PORT || '465'),
        smtpPass: process.env.IMAP_PASS || process.env.SMTP_PASS || '',
      },
      update: {},
    });
    accounts.push({ id: envAcct.id, email: envAcct.email, imapHost: envAcct.imapHost, imapPort: envAcct.imapPort, imapPass: envAcct.imapPass, lastInboxUid: envAcct.lastInboxUid, lastSentUid: envAcct.lastSentUid });
  }

  if (accounts.length === 0) return { synced: 0, error: 'No email accounts configured' };

  const results = await Promise.all(accounts.map(async (acct) => {
    const pass = acct.imapPass || process.env.IMAP_PASS || '';
    if (!pass) return null; // skip accounts with no password silently
    const r = await syncOneAccount({ ...acct, imapPass: pass });
    return { email: acct.email, ...r };
  }));
  const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null);

  const totalSynced = validResults.reduce((s, r) => s + r.synced, 0);
  const firstError  = validResults.find((r) => r.error)?.error;
  return { synced: totalSynced, results: validResults, error: firstError };
}
