'use strict';

function createMailer({ hosted, env = process.env }) {
  const key = env.RESEND_API_KEY?.trim();
  const from = env.MITTCSN_EMAIL_FROM?.trim();
  let origin;
  try {
    origin = new URL(env.MITTCSN_BASE_URL);
  } catch {
    return null;
  }
  if (!key || !from || !['https:', 'http:'].includes(origin.protocol) ||
      (hosted && origin.protocol !== 'https:') || origin.username || origin.password) return null;

  return async function sendAccountEmail({ email, kind, token }) {
    const url = new URL('/email-action.html', origin);
    url.hash = new URLSearchParams({ action: kind, token }).toString();
    const verify = kind === 'verify';
    const subject = verify ? 'Verifiera din e-post för MittCSN' : 'Återställ lösenordet för MittCSN';
    const timeout = verify ? '24 timmar' : '30 minuter';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        text: `${subject}\n\n${url}\n\nLänken kan användas en gång och gäller i ${timeout}. Om du inte väntar på det här mejlet kan du ignorera det.`,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`E-posttjänsten svarade med HTTP ${response.status}.`);
  };
}

module.exports = { createMailer };
