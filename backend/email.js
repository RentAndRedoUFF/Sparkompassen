'use strict';

function createMailer({ hosted, env = process.env, fetchImpl = fetch }) {
  const serviceId = env.EMAILJS_SERVICE_ID?.trim();
  const templateId = env.EMAILJS_TEMPLATE_ID?.trim();
  const publicKey = env.EMAILJS_PUBLIC_KEY?.trim();
  const privateKey = env.EMAILJS_PRIVATE_KEY?.trim();
  const emailJsReady = Boolean(serviceId && templateId && publicKey && privateKey);
  const resendKey = env.RESEND_API_KEY?.trim();
  const from = env.MITTCSN_EMAIL_FROM?.trim();
  let origin;
  try {
    origin = new URL(env.MITTCSN_BASE_URL);
  } catch {
    return null;
  }
  if ((!emailJsReady && !(resendKey && from)) || !['https:', 'http:'].includes(origin.protocol) ||
      (hosted && origin.protocol !== 'https:') || origin.username || origin.password) return null;

  return async function sendAccountEmail({ email, kind, token }) {
    const url = new URL('/email-action.html', origin);
    url.hash = new URLSearchParams({ action: kind, token }).toString();
    const verify = kind === 'verify';
    const subject = verify ? 'Verifiera din e-post för MittCSN' : 'Återställ lösenordet för MittCSN';
    const intro = verify
      ? 'Bekräfta din e-postadress för att kunna återställa lösenordet till ditt konto.'
      : 'Vi fick en begäran om att återställa ditt lösenord. Följ länken för att välja ett nytt.';
    const actionLabel = verify ? 'Verifiera e-postadressen' : 'Välj nytt lösenord';
    const expiration = verify ? '24 timmar' : '30 minuter';
    const message = `${subject}\n\n${url}\n\nLänken kan användas en gång och gäller i ${expiration}. Om du inte väntar på det här mejlet kan du ignorera det.`;
    const headers = { 'Content-Type': 'application/json' };
    let endpoint, body;
    if (emailJsReady) {
      endpoint = 'https://api.emailjs.com/api/v1.0/email/send';
      body = {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          to_email: email,
          subject,
          intro,
          message,
          action_url: url.href,
          action_label: actionLabel,
          expires_in: expiration,
        },
      };
    } else {
      endpoint = 'https://api.resend.com/emails';
      headers.Authorization = `Bearer ${resendKey}`;
      body = { from, to: [email], subject, text: message };
    }
    const response = await fetchImpl(endpoint, {
      method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`E-posttjänsten svarade med HTTP ${response.status}.`);
  };
}

module.exports = { createMailer };
