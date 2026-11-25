import { ORDER_NOTICE_CONFIRMATION_STEPS, ORDER_NOTICE_OUTSIDE, ORDER_THANKS, orderNoticeAbidjan } from '@/content/livraison';
import { DELIVERY_STATUS_LABELS, type DeliveryStatusValue } from '@/lib/constants/order-status';
import { formatFcfa } from '@/lib/money';
import { DELAY_DISCLAIMER, delaySentence, effectiveDelay } from '@/lib/shop/delivery-delay';
import { formatPlaceLabel } from '@/lib/shop/order-types';
import { formatPhoneDisplay } from '@/lib/shop/phone';
import { whatsappLink } from '@/lib/shop/whatsapp';
import type { ReceiptData } from '@/server/services/receipt.service';

// Gabarits des emails (RM-41 : les textes de paiement viennent de la source unique `content/livraison.ts`).
// Fonctions PURES. Tout ce que le client a saisi (nom, adresse, note) est ÉCHAPPÉ : un email HTML qui reprendrait du
// texte brut permettrait d'injecter du contenu dans la boîte de la vendeuse. Rien n'est inventé (RM-42) : ni délai de
// livraison, ni promesse, ni coordonnée absente.

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const INK = '#231f1c';
const MUTED = '#6b625b';
const RULE = '#e6dfd6';
const BG = '#faf7f2';

export const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Un sujet tient sur une ligne : retours à la ligne et caractères de contrôle retirés, longueur bornée. */
export function toSubject(value: string, max = 150): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

const money = (amount: number | null, fallback = 'à confirmer') => (amount === null ? fallback : formatFcfa(amount));
const fullName = (receipt: ReceiptData) => receipt.customer.fullName;
/** « Délai indicatif : 24 h. » : celui figé dans le reçu, sinon celui du type de zone (reçus plus anciens). */
const delayOf = (receipt: ReceiptData): string => {
  const { zoneType, delay } = receipt.delivery;
  return delaySentence(delay ?? effectiveDelay(zoneType, null, null));
};
const placeOf = (receipt: ReceiptData) => formatPlaceLabel(receipt.delivery.zoneType, receipt.delivery.city, receipt.delivery.country);

function noticeFor(receipt: ReceiptData): string {
  const { zoneType } = receipt.delivery;
  if (zoneType !== 'ABIDJAN') return ORDER_NOTICE_OUTSIDE;
  return receipt.amounts.upfrontAmount === null ? receipt.paymentTerms : orderNoticeAbidjan(receipt.amounts.upfrontAmount);
}

// ---------------------------------------------------------------------------
// Briques HTML
// ---------------------------------------------------------------------------

const heading = (text: string) => `<p style="margin:22px 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};font-weight:700">${escapeHtml(text)}</p>`;
const paragraph = (html: string) => `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:${INK}">${html}</p>`;

function linesTable(receipt: ReceiptData): string {
  const rows = receipt.lines
    .map(
      (line) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid ${RULE};font-size:14px;color:${INK}">${escapeHtml(line.name)}<br><span style="color:${MUTED};font-size:12px">${line.quantity} × ${escapeHtml(formatFcfa(line.unitPrice))}</span></td><td style="padding:6px 0;border-bottom:1px solid ${RULE};font-size:14px;text-align:right;white-space:nowrap;color:${INK}">${escapeHtml(formatFcfa(line.lineTotal))}</td></tr>`,
    )
    .join('');
  const total = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;font-size:14px;color:${strong ? INK : MUTED};${strong ? 'font-weight:700;' : ''}">${escapeHtml(label)}</td><td style="padding:4px 0;font-size:14px;text-align:right;color:${INK};${strong ? 'font-weight:700;' : ''}">${escapeHtml(value)}</td></tr>`;
  const { amounts } = receipt;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${rows}${total('Sous-total', money(amounts.subtotal))}${total('Frais de livraison', money(amounts.deliveryFee))}${total('Total', money(amounts.total), true)}</table>`;
}

function layout(input: { title: string; body: string; storeName: string }): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(input.title)}</title></head><body style="margin:0;padding:0;background:${BG}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG}"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid ${RULE};border-radius:12px"><tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:${INK}"><p style="margin:0 0 16px;font-size:18px;font-weight:700">${escapeHtml(input.storeName)}</p>${input.body}</td></tr></table></td></tr></table></body></html>`;
}

const textLines = (receipt: ReceiptData): string[] =>
  receipt.lines.map((line) => `- ${line.name} — ${line.quantity} × ${formatFcfa(line.unitPrice)} = ${formatFcfa(line.lineTotal)}`);

const textTotals = (receipt: ReceiptData): string[] => [
  `Sous-total : ${money(receipt.amounts.subtotal)}`,
  `Frais de livraison : ${money(receipt.amounts.deliveryFee)}`,
  `Total : ${money(receipt.amounts.total)}`,
];

// ---------------------------------------------------------------------------
// Alerte à la vendeuse — NEW_ORDER_SELLER (le reçu PDF est joint par l'envoi)
// ---------------------------------------------------------------------------

export interface SellerEmailInput {
  reference: string;
  receipt: ReceiptData;
  customerNote: string | null;
  storeName: string;
}

export function buildSellerNewOrderEmail(input: SellerEmailInput): EmailContent {
  const { receipt, reference } = input;
  const name = fullName(receipt);
  const contactLink = whatsappLink(receipt.customer.phone);
  const phone = formatPhoneDisplay(receipt.customer.phone);
  const upfront = receipt.amounts.upfrontAmount === null ? 'montant confirmé par la vendeuse' : formatFcfa(receipt.amounts.upfrontAmount);
  const upfrontLabel = receipt.delivery.zoneType === 'ABIDJAN' ? 'Acompte pour confirmer' : 'À régler avant expédition';
  const steps = ORDER_NOTICE_CONFIRMATION_STEPS;

  const body = [
    paragraph(`<strong>Nouvelle commande ${escapeHtml(reference)}</strong>`),
    heading('Client'),
    paragraph(`${escapeHtml(name)}<br>${escapeHtml(phone)}${contactLink ? ` — <a href="${escapeHtml(contactLink)}" style="color:${INK}">écrire sur WhatsApp</a>` : ''}${receipt.customer.email ? `<br>${escapeHtml(receipt.customer.email)}` : ''}`),
    heading('Livraison'),
    paragraph(`<strong>${escapeHtml(placeOf(receipt))}</strong><br>${escapeHtml(receipt.delivery.address).replace(/\n/g, '<br>')}<br><span style="color:${MUTED}">${escapeHtml(delayOf(receipt))}</span>`),
    heading('Articles'),
    linesTable(receipt),
    paragraph(`<span style="color:${MUTED}">${escapeHtml(upfrontLabel)} :</span> <strong>${escapeHtml(upfront)}</strong>`),
    ...(input.customerNote ? [heading('Note du client'), paragraph(escapeHtml(input.customerNote).replace(/\n/g, '<br>'))] : []),
    heading('Modalité de paiement annoncée'),
    paragraph(escapeHtml(receipt.paymentTerms)),
    heading('À faire'),
    paragraph(`Contactez le client sur WhatsApp afin de : ${escapeHtml(steps.join(' ; '))}.`),
    paragraph(`<span style="color:${MUTED}">Le reçu est joint en PDF. Aucun paiement n’est enregistré à ce stade.</span>`),
  ].join('');

  const text = [
    `Nouvelle commande ${reference}`,
    '',
    `Client : ${name}`,
    `Téléphone : ${phone}${contactLink ? ` (${contactLink})` : ''}`,
    ...(receipt.customer.email ? [`Email : ${receipt.customer.email}`] : []),
    '',
    `Livraison : ${placeOf(receipt)}`,
    `Adresse : ${receipt.delivery.address.replace(/\s*\n\s*/g, ', ')}`,
    delayOf(receipt),
    '',
    'Articles :',
    ...textLines(receipt),
    '',
    ...textTotals(receipt),
    `${upfrontLabel} : ${upfront}`,
    ...(input.customerNote ? ['', `Note du client : ${input.customerNote.replace(/\s*\n\s*/g, ' ')}`] : []),
    '',
    `Modalité de paiement annoncée : ${receipt.paymentTerms}`,
    '',
    `À faire : contactez le client sur WhatsApp afin de : ${steps.join(' ; ')}.`,
    'Le reçu est joint en PDF. Aucun paiement n’est enregistré à ce stade.',
  ].join('\n');

  return { subject: toSubject(`Nouvelle commande ${reference} — ${name}`), html: layout({ title: `Nouvelle commande ${reference}`, body, storeName: input.storeName }), text };
}

// ---------------------------------------------------------------------------
// Accusé de réception au client — ORDER_RECEIVED_CUSTOMER
// ---------------------------------------------------------------------------

export interface CustomerEmailInput {
  reference: string;
  receipt: ReceiptData;
  storeName: string;
}

export function buildCustomerReceivedEmail(input: CustomerEmailInput): EmailContent {
  const { receipt, reference } = input;
  const notice = noticeFor(receipt);
  const steps = ORDER_NOTICE_CONFIRMATION_STEPS;
  const contact = [receipt.shop.contactPhone, receipt.shop.contactEmail].filter((value): value is string => Boolean(value));

  const body = [
    paragraph(`Bonjour ${escapeHtml(receipt.customer.fullName)},`),
    paragraph(`${escapeHtml(ORDER_THANKS)} Votre commande <strong>${escapeHtml(reference)}</strong> est bien enregistrée.`),
    heading('Récapitulatif'),
    linesTable(receipt),
    paragraph(`<span style="color:${MUTED}">Livraison : ${escapeHtml(placeOf(receipt))}</span>`),
    heading('Paiement et livraison'),
    paragraph(escapeHtml(notice)),
    paragraph(escapeHtml(`${delayOf(receipt)} ${DELAY_DISCLAIMER}`)),
    paragraph(`Après réception de la commande, l’équipe vous contacte sur WhatsApp afin de : ${escapeHtml(steps.join(' ; '))}.`),
    ...(contact.length > 0 ? [paragraph(`<span style="color:${MUTED}">Une question ? ${escapeHtml(contact.join(' · '))}</span>`)] : []),
  ].join('');

  const text = [
    `Bonjour ${receipt.customer.fullName},`,
    '',
    `${ORDER_THANKS} Votre commande ${reference} est bien enregistrée.`,
    '',
    'Récapitulatif :',
    ...textLines(receipt),
    '',
    ...textTotals(receipt),
    `Livraison : ${placeOf(receipt)}`,
    '',
    notice,
    `${delayOf(receipt)} ${DELAY_DISCLAIMER}`,
    `Après réception de la commande, l’équipe vous contacte sur WhatsApp afin de : ${steps.join(' ; ')}.`,
    ...(contact.length > 0 ? ['', `Une question ? ${contact.join(' · ')}`] : []),
  ].join('\n');

  return { subject: toSubject(`Votre commande ${reference} est enregistrée`), html: layout({ title: `Commande ${reference}`, body, storeName: input.storeName }), text };
}

// ---------------------------------------------------------------------------
// Changement de statut — STATUS_CHANGED_CUSTOMER (déclenché par l'écran des commandes, étape 10)
// ---------------------------------------------------------------------------

export interface StatusEmailInput {
  reference: string;
  receipt: ReceiptData;
  storeName: string;
  deliveryStatus: DeliveryStatusValue;
}

export function buildStatusChangedEmail(input: StatusEmailInput): EmailContent {
  const label = DELIVERY_STATUS_LABELS[input.deliveryStatus];
  const name = input.receipt.customer.fullName;
  const body = [
    paragraph(`Bonjour ${escapeHtml(name)},`),
    paragraph(`Le statut de votre commande <strong>${escapeHtml(input.reference)}</strong> est maintenant : <strong>${escapeHtml(label)}</strong>.`),
  ].join('');
  const text = [`Bonjour ${name},`, '', `Le statut de votre commande ${input.reference} est maintenant : ${label}.`].join('\n');
  return { subject: toSubject(`Votre commande ${input.reference} : ${label}`), html: layout({ title: `Commande ${input.reference}`, body, storeName: input.storeName }), text };
}

// ---------------------------------------------------------------------------
// Alerte analytics — NEW_VISITOR (P-45 : aucune donnée personnelle, aucune adresse IP)
// ---------------------------------------------------------------------------

export interface NewVisitorEmailInput {
  storeName: string;
  /** Provenance lisible (« Instagram », « Accès direct »…). */
  sourceLabel: string;
  landingPath: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  /** Heure d'arrivée, déjà au format d'Abidjan. */
  arrivedAt: string;
}

export function buildNewVisitorEmail(input: NewVisitorEmailInput): EmailContent {
  const place = [input.region ?? input.city, input.country].filter(Boolean).join(', ') || 'zone inconnue';
  const details = [input.city && input.city !== input.region ? input.city : null, input.region, input.country].filter(Boolean).join(', ') || 'non précisée';
  const device = [input.device, input.browser].filter(Boolean).join(' · ') || 'non précisé';
  const body = [
    paragraph('<strong>Un nouveau visiteur a accepté les statistiques anonymes et vient d’arriver sur le site.</strong>'),
    heading('Zone approximative'),
    paragraph(escapeHtml(details)),
    heading('Provenance'),
    paragraph(escapeHtml(input.sourceLabel)),
    heading('Page d’arrivée'),
    paragraph(escapeHtml(input.landingPath || '/')),
    heading('Appareil'),
    paragraph(escapeHtml(device)),
    heading('Heure (Abidjan)'),
    paragraph(escapeHtml(input.arrivedAt)),
    paragraph(`<span style="color:${MUTED}">Aucune adresse IP, aucune identité et aucune donnée de commande ne figurent dans cette alerte. Le détail est dans l’onglet Analytics du back-office.</span>`),
  ].join('');
  const text = [
    'Nouvelle visite',
    '',
    `Zone approximative : ${details}`,
    `Provenance : ${input.sourceLabel}`,
    `Page d’arrivée : ${input.landingPath || '/'}`,
    `Appareil : ${device}`,
    `Heure (Abidjan) : ${input.arrivedAt}`,
    '',
    'Aucune adresse IP, aucune identité et aucune donnée de commande ne figurent dans cette alerte.',
  ].join('\n');
  return { subject: toSubject(`Nouvelle visite depuis ${place}`), html: layout({ title: 'Nouvelle visite', body, storeName: input.storeName }), text };
}
