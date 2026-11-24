import { LANDING } from '@/content/landing';
import type { ContactInput } from '@/lib/validation/contact.schema';
import { formatPhoneDisplay } from '@/lib/shop/phone';
import { whatsappLink } from '@/lib/shop/whatsapp';
import { escapeHtml, toSubject, type EmailContent } from '@/server/services/email-templates';

// Courriel envoyé à la vendeuse quand un client écrit par le formulaire de contact. Fonction PURE.
// Tout ce que le client a saisi est ÉCHAPPÉ (un courriel HTML qui reprendrait du texte brut permettrait d'injecter du
// contenu dans la boîte de la vendeuse). Le sujet tient sur une ligne : retours à la ligne retirés.

const INK = '#231f1c';
const MUTED = '#6b625b';
const RULE = '#e6dfd6';
const BG = '#faf7f2';

const row = (label: string, valueHtml: string) =>
  `<tr><td style="padding:6px 12px 6px 0;color:${MUTED};font-size:13px;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:15px;color:${INK}">${valueHtml}</td></tr>`;

export function buildContactEmail(input: ContactInput, storeName: string): EmailContent {
  const topic = LANDING.contact.form.topics[input.topic];
  const subject = toSubject(`Nouveau message : ${topic} — ${input.name}`);
  const waLink = input.phoneE164 ? whatsappLink(input.phoneE164) : null;

  const reply =
    input.replyChannel === 'WHATSAPP' && input.phoneE164
      ? `WhatsApp : ${formatPhoneDisplay(input.phoneE164)}`
      : `E-mail : ${input.email ?? ''}`;

  const rows = [
    row('Sujet', escapeHtml(topic)),
    row('Nom', escapeHtml(input.name)),
    row('Répondre par', input.replyChannel === 'WHATSAPP' ? 'WhatsApp' : 'E-mail'),
    input.phoneE164
      ? row('WhatsApp', waLink ? `<a href="${escapeHtml(waLink)}" style="color:${INK}">${escapeHtml(formatPhoneDisplay(input.phoneE164))}</a>` : escapeHtml(formatPhoneDisplay(input.phoneE164)))
      : '',
    input.email ? row('E-mail', `<a href="mailto:${escapeHtml(input.email)}" style="color:${INK}">${escapeHtml(input.email)}</a>`) : '',
    input.orderReference ? row('Commande', escapeHtml(input.orderReference)) : '',
  ].join('');

  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:${BG};font-family:Arial,Helvetica,sans-serif;color:${INK}">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};font-weight:700">${escapeHtml(storeName)}</p>
<h1 style="margin:0 0 16px;font-size:20px">Nouveau message du formulaire de contact</h1>
<table role="presentation" style="border-collapse:collapse;width:100%;border-top:1px solid ${RULE};border-bottom:1px solid ${RULE}">${rows}</table>
<p style="margin:18px 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};font-weight:700">Message</p>
<p style="margin:0;font-size:15px;line-height:1.55;white-space:pre-wrap">${escapeHtml(input.message)}</p>
<p style="margin:22px 0 0;font-size:13px;color:${MUTED}">Répondez directement à ce courriel si le client a donné son adresse e-mail, ou écrivez-lui sur WhatsApp.</p>
</div></body></html>`;

  const text = [
    `${storeName} — nouveau message du formulaire de contact`,
    '',
    `Sujet : ${topic}`,
    `Nom : ${input.name}`,
    `Réponse souhaitée : ${reply}`,
    input.email && input.replyChannel === 'WHATSAPP' ? `E-mail : ${input.email}` : '',
    input.orderReference ? `Commande : ${input.orderReference}` : '',
    '',
    input.message,
  ]
    .filter((line, index, all) => line !== '' || (index > 0 && all[index - 1] !== ''))
    .join('\n');

  return { subject, html, text };
}
