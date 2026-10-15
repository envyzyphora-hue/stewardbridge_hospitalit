/**
 * Best-effort admin email notifications. Recipient is the configured business
 * mailbox; the sender must be a verified address/domain with Resend.
 * Never include passwords, tokens, full CV contents, or authentication headers.
 */
export async function sendAdminEmailAlert(input: {
  subject: string;
  text: string;
}) {
  const to = process.env.SIGNIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || process.env.PUBLIC_CONTACT_EMAIL || "elubodetimothy@gmail.com";
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { sent: false as const, reason: "email_provider_not_configured" };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: input.subject, text: input.text }),
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return { sent: false as const, reason: `provider_http_${response.status}` };
    return { sent: true as const };
  } catch {
    return { sent: false as const, reason: "provider_unreachable" };
  }
}

export function getPublicSiteUrl() {
  return (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://stewardbridge.com").replace(/\/$/, "");
}
