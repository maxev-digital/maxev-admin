import nodemailer from 'nodemailer';

const FROM_INFO    = process.env.SMTP_USER_INFO    || 'info@maxevdigital.com';
const FROM_BILLING = process.env.SMTP_USER_BILLING || 'billing@maxevdigital.com';
const OWNER_EMAIL  = process.env.OWNER_EMAIL       || FROM_INFO;

function makeTransport() {
  const host = process.env.SMTP_HOST;
  const pass = process.env.SMTP_PASS;
  if (!host || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: (process.env.SMTP_PORT || '465') === '465',
    auth: { user: FROM_INFO, pass },
  });
}

export async function sendOwnerNewLeadAlert(lead: {
  businessName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  industry: string;
  source?: string | null;
  notes?: string | null;
}) {
  const transport = makeTransport();
  if (!transport) {
    console.warn('[email] SMTP not configured — skipping owner alert');
    return;
  }
  await transport.sendMail({
    from: `"Max EV Digital" <${FROM_INFO}>`,
    to: OWNER_EMAIL,
    subject: `New Lead: ${lead.businessName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:12px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#3B7DD9;text-transform:uppercase;margin-bottom:8px;">New Lead</div>
        <h2 style="font-size:22px;margin:0 0 20px;color:#fff;">${lead.businessName}</h2>
        <table style="width:100%;border-collapse:collapse;">
          ${[
            ['Contact',  lead.contactName || '—'],
            ['Email',    lead.email ? `<a href="mailto:${lead.email}" style="color:#3B7DD9">${lead.email}</a>` : '—'],
            ['Phone',    lead.phone || '—'],
            ['Industry', lead.industry],
            ['Source',   lead.source || 'Web Form'],
            ['Notes',    lead.notes || '—'],
          ].map(([k, v]) => `
            <tr>
              <td style="padding:8px 0;font-size:12px;color:#888;width:90px;vertical-align:top;">${k}</td>
              <td style="padding:8px 0;font-size:14px;color:#fff;">${v}</td>
            </tr>
          `).join('')}
        </table>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.maxevdigital.com'}/pipeline"
           style="display:inline-block;margin-top:24px;padding:10px 20px;background:#3B7DD9;color:#fff;border-radius:7px;font-size:13px;font-weight:600;text-decoration:none;">
          View in Pipeline
        </a>
      </div>`,
  });
}

export async function sendClientInvoice(opts: {
  toEmail: string;
  toName: string;
  businessName: string;
  invoiceNumber: string;
  amount: number;
  dueDate?: Date | null;
  stripeLink?: string | null;
  notes?: string | null;
}) {
  const transport = makeTransport();
  if (!transport) {
    console.warn('[email] SMTP not configured — skipping invoice email');
    return;
  }
  const dueDateStr = opts.dueDate ? new Date(opts.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;
  await transport.sendMail({
    from: `"Max EV Digital Billing" <${FROM_BILLING}>`,
    to: opts.toEmail,
    subject: `Invoice ${opts.invoiceNumber} — $${opts.amount.toLocaleString()} due`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:12px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#3B7DD9;text-transform:uppercase;margin-bottom:8px;">Max EV Digital</div>
        <h2 style="font-size:22px;margin:0 0 6px;">Invoice ${opts.invoiceNumber}</h2>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">Hi ${opts.toName}, here is your invoice from Max EV Digital.</p>
        <div style="background:#111;border-radius:10px;padding:20px;margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
            <span style="color:#888;font-size:13px;">Amount Due</span>
            <span style="color:#14B8AD;font-size:22px;font-weight:900;">$${opts.amount.toLocaleString()}</span>
          </div>
          ${dueDateStr ? `<div style="display:flex;justify-content:space-between;">
            <span style="color:#888;font-size:13px;">Due Date</span>
            <span style="color:#fff;font-size:13px;font-weight:600;">${dueDateStr}</span>
          </div>` : ''}
        </div>
        ${opts.stripeLink ? `
        <a href="${opts.stripeLink}" style="display:block;text-align:center;padding:14px;background:#3B7DD9;color:#fff;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:20px;">
          Pay Now — $${opts.amount.toLocaleString()}
        </a>` : ''}
        ${opts.notes ? `<p style="color:#888;font-size:13px;line-height:1.6;">${opts.notes}</p>` : ''}
        <p style="color:#444;font-size:12px;margin-top:24px;">Questions? Reply to this email or contact info@maxevdigital.com</p>
      </div>`,
  });
}

export async function sendHelpdeskReply(opts: {
  toEmail: string;
  toName: string;
  subject: string;
  replyBody: string;
  ticketId: string;
}) {
  const transport = makeTransport();
  if (!transport) {
    console.warn('[email] SMTP not configured — skipping helpdesk reply');
    return;
  }
  await transport.sendMail({
    from: `"MAX EV Digital Support" <${FROM_INFO}>`,
    to: opts.toEmail,
    subject: `Re: ${opts.subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:12px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#3B7DD9;text-transform:uppercase;margin-bottom:8px;">Support Reply</div>
        <p style="color:#ccc;font-size:14px;margin:0 0 20px;">Hi ${opts.toName}, here is our response to your support request.</p>
        <div style="background:#111;border-radius:10px;padding:20px;margin-bottom:24px;font-size:14px;color:#e5e5e5;line-height:1.7;white-space:pre-wrap;">${opts.replyBody}</div>
        <p style="color:#666;font-size:12px;margin:0;">Ticket reference: #${opts.ticketId.slice(0, 8).toUpperCase()}</p>
        <p style="color:#444;font-size:12px;margin-top:8px;">Reply directly to this email or contact info@maxevdigital.com</p>
      </div>`,
  });
}

export async function sendPasswordReset(opts: {
  toEmail: string;
  toName: string;
  resetLink: string;
}) {
  const transport = makeTransport();
  if (!transport) {
    console.warn('[email] SMTP not configured — skipping password reset');
    return;
  }
  await transport.sendMail({
    from: `"MAX EV Digital" <${FROM_INFO}>`,
    to: opts.toEmail,
    subject: 'Reset your password',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:12px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#3B7DD9;text-transform:uppercase;margin-bottom:8px;">Account Security</div>
        <h2 style="font-size:20px;margin:0 0 12px;">Reset Your Password</h2>
        <p style="color:#ccc;font-size:14px;margin:0 0 24px;">Hi ${opts.toName}, click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${opts.resetLink}" style="display:inline-block;padding:12px 24px;background:#3B7DD9;color:#fff;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">Reset Password</a>
        <p style="color:#444;font-size:12px;margin-top:24px;">If you did not request a password reset, ignore this email.</p>
      </div>`,
  });
}

export async function sendNewsletter(opts: {
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
  unsubscribeEmail?: string;
}) {
  const transport = makeTransport();
  if (!transport) {
    console.warn('[email] SMTP not configured — skipping newsletter');
    return false;
  }
  await transport.sendMail({
    from: `"Max EV Digital" <${FROM_INFO}>`,
    to: opts.toEmail,
    subject: opts.subject,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#fff;border-radius:12px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#3B7DD9;text-transform:uppercase;margin-bottom:8px;">Max EV Digital</div>
        <div style="font-size:14px;color:#ccc;line-height:1.75;white-space:pre-wrap;margin-bottom:32px;">${opts.body}</div>
        <div style="border-top:1px solid #1a1a1a;padding-top:16px;font-size:11px;color:#555;">
          You received this because you subscribed to Max EV Digital updates.
          ${opts.unsubscribeEmail ? `<br>To unsubscribe, reply with subject "unsubscribe" to <a href="mailto:${opts.unsubscribeEmail}" style="color:#3B7DD9;">${opts.unsubscribeEmail}</a>` : ''}
        </div>
      </div>`,
  });
  return true;
}

export async function sendCustomEmail(opts: {
  to: string;
  subject: string;
  body: string;
  fromAlias?: string;
}) {
  const transport = makeTransport();
  if (!transport) {
    console.warn('[email] SMTP not configured — skipping custom email');
    return { ok: false, error: 'SMTP not configured' };
  }
  const alias = opts.fromAlias ?? 'Max EV Digital';
  try {
    await transport.sendMail({
      from: `"${alias}" <${FROM_INFO}>`,
      to: opts.to,
      subject: opts.subject,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:28px 24px;background:#0a0a0a;color:#fff;border-radius:12px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#3B7DD9;text-transform:uppercase;margin-bottom:16px;">Max EV Digital</div>
          <div style="font-size:14px;color:#ddd;line-height:1.75;white-space:pre-wrap;">${opts.body}</div>
          <div style="border-top:1px solid #1a1a1a;margin-top:28px;padding-top:16px;">
            <p style="color:#555;font-size:12px;margin:0;">Max EV Digital &bull; info@maxevdigital.com</p>
          </div>
        </div>`,
    });
    return { ok: true };
  } catch (err) {
    console.error('[email] sendCustomEmail failed:', err);
    return { ok: false, error: String(err) };
  }
}

export async function sendProposalEmail(opts: {
  toEmail:        string;
  toName:         string;
  businessName:   string;
  proposalNumber: string;
  oneTimeTotal:   number;
  monthlyTotal:   number;
  lineItems:      { name: string; price: number }[];
  signUrl:        string;
  message?:       string | null;
}) {
  const transport = makeTransport();
  if (!transport) {
    console.warn('[email] SMTP not configured — skipping proposal email');
    return { ok: false, error: 'SMTP not configured' };
  }
  const rows = opts.lineItems.map((li) =>
    `<tr><td style="padding:8px 12px;font-size:13px;color:#e5e5e5;border-bottom:1px solid #1a1a1a;">${li.name}</td><td style="padding:8px 12px;font-size:13px;color:#14B8AD;font-weight:600;text-align:right;border-bottom:1px solid #1a1a1a;">$${li.price.toLocaleString()}</td></tr>`
  ).join('');
  try {
    await transport.sendMail({
      from:    `"SampleShield Security" <${FROM_INFO}>`,
      to:      opts.toEmail,
      subject: `Your Security Proposal — ${opts.proposalNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#0a0a0a;border-radius:12px;overflow:hidden;">
          <div style="padding:28px 32px;background:#111;border-bottom:1px solid #1a1a1a;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#14B8AD;text-transform:uppercase;margin-bottom:6px;">SampleShield Security</div>
            <h1 style="color:#fff;font-size:22px;margin:0 0 4px;">Security Proposal</h1>
            <div style="color:#888;font-size:13px;">${opts.proposalNumber} &bull; ${opts.businessName}</div>
          </div>
          <div style="padding:28px 32px;">
            ${opts.message ? `<p style="color:#ccc;font-size:14px;line-height:1.7;margin:0 0 24px;">${opts.message}</p>` : ''}
            <table style="width:100%;border-collapse:collapse;background:#111;border-radius:8px;overflow:hidden;margin-bottom:16px;">
              <thead><tr style="background:#1a1a1a;"><th style="padding:10px 12px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#888;text-align:left;">Item</th><th style="padding:10px 12px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#888;text-align:right;">Price</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="background:#111;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="color:#888;font-size:13px;">One-Time Total</span>
                <span style="color:#fff;font-size:16px;font-weight:700;">$${opts.oneTimeTotal.toLocaleString()}</span>
              </div>
              ${opts.monthlyTotal > 0 ? `<div style="display:flex;justify-content:space-between;"><span style="color:#888;font-size:13px;">Monthly Monitoring</span><span style="color:#14B8AD;font-size:14px;font-weight:600;">$${opts.monthlyTotal.toLocaleString()}/mo</span></div>` : ''}
            </div>
            <a href="${opts.signUrl}" style="display:block;text-align:center;padding:16px 24px;background:#14B8AD;color:#000;border-radius:8px;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">
              Review &amp; Sign Proposal
            </a>
            <p style="color:#555;font-size:12px;text-align:center;margin-top:16px;">This proposal expires in 30 days. Questions? Reply to this email.</p>
          </div>
        </div>`,
    });
    return { ok: true };
  } catch (err) {
    console.error('[email] sendProposalEmail failed:', err);
    return { ok: false, error: String(err) };
  }
}

export async function sendInviteEmail(opts: {
  toEmail:   string;
  invitedBy: string;
  role:      string;
  inviteLink: string;
}) {
  const transport = makeTransport();
  if (!transport) {
    console.warn('[email] SMTP not configured — skipping invite email');
    return;
  }
  await transport.sendMail({
    from: `"MAX EV Digital" <${FROM_INFO}>`,
    to: opts.toEmail,
    subject: 'You have been invited to MAX EV Digital Admin',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:12px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#3B7DD9;text-transform:uppercase;margin-bottom:8px;">Admin Panel Invitation</div>
        <h2 style="font-size:20px;margin:0 0 12px;">You have been invited</h2>
        <p style="color:#ccc;font-size:14px;margin:0 0 24px;">
          ${opts.invitedBy} has invited you to join the MAX EV Digital Admin Panel as a <strong>${opts.role}</strong>.
        </p>
        <a href="${opts.inviteLink}" style="display:inline-block;padding:12px 24px;background:#3B7DD9;color:#fff;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">
          Accept Invitation
        </a>
        <p style="color:#444;font-size:12px;margin-top:24px;">This invitation expires in 7 days.</p>
      </div>`,
  });
}
