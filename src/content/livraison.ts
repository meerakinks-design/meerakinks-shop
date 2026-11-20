import type { ZoneTypeValue } from '@/lib/constants/order';
import { formatFcfa } from '@/lib/money';

// SOURCE UNIQUE des règles de paiement et de livraison (RM-41). Le footer, la FAQ, le panier, le
// formulaire de commande, la page de confirmation et les emails reprennent ces textes : ils ne
// peuvent donc jamais se contredire. Texte validé par la cliente (annexe B du cahier des charges).

export const PAYMENT_FOLLOW_UP = 'Les modalités sont communiquées par la vendeuse après confirmation de la commande.';

export const paymentAbidjan = (depositAmount: number) =>
  `À Abidjan : acompte de ${formatFcfa(depositAmount)} pour confirmer la commande, puis solde à la livraison.`;

export const PAYMENT_OUTSIDE = 'Hors d’Abidjan et à l’international : paiement intégral avant expédition.';

/** Rappel court (footer, panier, formulaire). */
export const paymentReminder = (depositAmount: number) => `${paymentAbidjan(depositAmount)} ${PAYMENT_OUTSIDE} ${PAYMENT_FOLLOW_UP}`;

export const DELIVERY_FEES_NOTE = 'Les frais de livraison sont communiqués par la vendeuse après réception de votre commande.';

/** Modalité de paiement annoncée pour une zone (message WhatsApp, reçu, email, confirmation). */
export const paymentTerms = (zoneType: ZoneTypeValue, depositAmount: number) =>
  `${zoneType === 'ABIDJAN' ? paymentAbidjan(depositAmount) : PAYMENT_OUTSIDE} ${PAYMENT_FOLLOW_UP}`;

// Note d'information visible AVANT la validation de la commande (RM-11) : texte validé, annexe B du cahier des charges.
export const ORDER_NOTICE_TITLE = 'Paiement et livraison';

export const orderNoticeAbidjan = (depositAmount: number) =>
  `Pour les commandes dans les communes d’Abidjan : le paiement s’effectue à la livraison ; un acompte de ${formatFcfa(depositAmount)} est demandé pour confirmer la commande ; le solde est réglé à la réception de la commande.`;

export const ORDER_NOTICE_OUTSIDE =
  'Pour les commandes provenant de l’intérieur du pays ou de l’étranger : le paiement intégral de la commande est requis avant l’expédition ; les frais d’expédition sont inclus dans le montant à régler ; le paiement s’effectue par Wave au numéro communiqué par la vendeuse après confirmation de la commande.';

export const ORDER_NOTICE_CONFIRMATION_INTRO = 'Après réception de la commande, l’équipe contacte le client sur WhatsApp afin de :';
export const ORDER_NOTICE_CONFIRMATION_STEPS = [
  'vérifier les informations fournies',
  'confirmer la disponibilité des produits',
  'préciser les frais de livraison',
  'communiquer les modalités de paiement',
] as const;
export const ORDER_THANKS = 'Merci pour votre confiance !';
