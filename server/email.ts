// Thin wrapper around the Resend transactional-email REST API.
//
// We deliberately call the HTTP endpoint directly (no SDK) to keep the
// dependency surface small. All sends are best-effort and never throw — email
// failures must not break signup or payment-approval flows.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Resend requires a verified domain; until one is configured we fall back to
// their shared sandbox sender, which can only deliver to the account owner's
// address. Override via EMAIL_FROM once a domain is verified.
const DEFAULT_FROM = "Kontrib <onboarding@resend.dev>";

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

async function send({ to, subject, html, text }: SendArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
    return false;
  }
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[email] Resend rejected send to ${to}: ${res.status} ${res.statusText} ${body}`,
      );
      return false;
    }
    return true;
  } catch (e: any) {
    console.error(`[email] Resend send failed for ${to}:`, e?.message || e);
    return false;
  }
}

function wrapShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${htmlEscape(title)}</title></head>
<body style="margin:0;padding:24px;background:#f9fafb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;">
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="font-size:12px;color:#6b7280;margin:0;">Sent by Kontrib · Group contributions made simple.</p>
  </div>
</body></html>`;
}

export async function sendWelcomeEmail(args: {
  to: string;
  fullName?: string | null;
}): Promise<boolean> {
  const name = (args.fullName || "").trim().split(/\s+/)[0] || "there";
  const subject = "Welcome to Kontrib — your email is linked";
  const bodyHtml = `
    <h1 style="font-size:20px;margin:0 0 12px;">Hi ${htmlEscape(name)}, your Google account is linked.</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">
      Thanks for linking your email to Kontrib. From now on we'll send your contribution receipts
      and important account notices to <strong>${htmlEscape(args.to)}</strong>.
    </p>
    <p style="font-size:14px;line-height:1.6;margin:0;">
      You can keep using WhatsApp to sign in — linking Google just makes receipts and account
      recovery easier.
    </p>`;
  const text =
    `Hi ${name},\n\n` +
    `Your Google account is now linked to Kontrib. We'll send contribution receipts and ` +
    `important account notices to ${args.to}.\n\n` +
    `You can keep using WhatsApp to sign in — linking Google just makes receipts and account ` +
    `recovery easier.\n\n— Kontrib`;
  return send({ to: args.to, subject, html: wrapShell(subject, bodyHtml), text });
}

export async function sendReceiptEmail(args: {
  to: string;
  fullName?: string | null;
  amount: string | number;
  groupName: string;
  projectName?: string | null;
  confirmedAt?: Date | string | null;
  contributionId: string;
}): Promise<boolean> {
  const name = (args.fullName || "").trim().split(/\s+/)[0] || "there";
  const amountNum =
    typeof args.amount === "string" ? parseFloat(args.amount) : args.amount;
  const amountStr = Number.isFinite(amountNum)
    ? new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2,
      }).format(amountNum)
    : `₦${args.amount}`;
  const when = args.confirmedAt ? new Date(args.confirmedAt) : new Date();
  const whenStr = when.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const subject = `Receipt: ${amountStr} to ${args.groupName}`;
  const projectLine = args.projectName
    ? `<tr><td style="padding:6px 0;color:#6b7280;">Project</td><td style="padding:6px 0;text-align:right;">${htmlEscape(args.projectName)}</td></tr>`
    : "";
  const bodyHtml = `
    <h1 style="font-size:20px;margin:0 0 12px;">Payment confirmed</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
      Hi ${htmlEscape(name)}, your contribution to <strong>${htmlEscape(args.groupName)}</strong>
      has been approved by the group admin. Keep this email as your receipt.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;">Amount</td><td style="padding:6px 0;text-align:right;"><strong>${htmlEscape(amountStr)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Group</td><td style="padding:6px 0;text-align:right;">${htmlEscape(args.groupName)}</td></tr>
      ${projectLine}
      <tr><td style="padding:6px 0;color:#6b7280;">Confirmed</td><td style="padding:6px 0;text-align:right;">${htmlEscape(whenStr)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Reference</td><td style="padding:6px 0;text-align:right;font-family:ui-monospace,monospace;font-size:12px;">${htmlEscape(args.contributionId)}</td></tr>
    </table>`;
  const text =
    `Hi ${name},\n\n` +
    `Your contribution to ${args.groupName} has been approved.\n\n` +
    `Amount: ${amountStr}\n` +
    (args.projectName ? `Project: ${args.projectName}\n` : "") +
    `Confirmed: ${whenStr}\n` +
    `Reference: ${args.contributionId}\n\n` +
    `Keep this email as your receipt.\n\n— Kontrib`;
  return send({ to: args.to, subject, html: wrapShell(subject, bodyHtml), text });
}
