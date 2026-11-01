import "server-only";

/**
 * Sends email through Resend (https://resend.com) when RESEND_API_KEY is set.
 * Without a key, the message is logged instead so the flows still work locally.
 * Returns false if sending failed or email isn't configured in production.
 */
export async function sendEmail(
  to: string, subject: string, text: string, html: string, headers?: Record<string, string>, replyTo?: string,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "linksh.it <hello@linksh.it>";
  if (!key) {
    console.log(`[email] RESEND_API_KEY not set. Would send to ${to}:\n${subject}\n${text}`);
    return process.env.NODE_ENV !== "production";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text, html, ...(headers ? { headers } : {}), ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) console.error("[email] Resend error", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY) || process.env.NODE_ENV !== "production";

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function buttonEmail(heading: string, body: string, cta: string, url: string) {
  const text = `${heading}\n\n${body}\n\n${cta}: ${url}\n\nDidn't ask for this? Ignore it and carry on. Nothing happens unless you click.\n— linksh.it`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1c1917">
<p style="font-family:monospace;font-size:20px;font-weight:700">linksh<span style="color:#84cc16">.</span>it</p>
<h1 style="font-size:22px">${esc(heading)}</h1><p>${esc(body)}</p>
<p><a href="${esc(url)}" style="display:inline-block;background:#1c1917;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:700">${esc(cta)}</a></p>
<p style="color:#78716c;font-size:13px">Didn't ask for this? Ignore it and carry on. Nothing happens unless you click.</p></div>`;
  return { text, html };
}
