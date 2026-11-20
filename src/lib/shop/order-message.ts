import { paymentTerms } from '@/content/livraison';
import { formatFcfa } from '@/lib/money';
import type { OrderRecap } from '@/lib/shop/order-types';

export interface OrderMessageInput extends OrderRecap {
  storeName: string;
  customerName: string;
  /** Téléphone déjà mis en forme (+225 07 00 00 00 00). */
  phone: string;
  address: string;
  note: string | null;
  /** Acompte annoncé pour une commande à Abidjan (celui de CETTE commande). */
  depositAmount: number;
}

/**
 * Message WhatsApp prérempli (RM-12, §6.4). Fonction pure : le texte est construit à partir de la commande
 * ENREGISTRÉE, jamais du navigateur. Il ne contient jamais le numéro Wave (RM-08).
 */
export function buildOrderMessage(input: OrderMessageInput): string {
  const lines: string[] = [
    `Bonjour, je viens de passer la commande ${input.reference} sur ${input.storeName}.`,
    '',
    `Client : ${input.customerName}`,
    `Téléphone : ${input.phone}`,
    `Livraison : ${input.placeLabel}`,
    `Adresse : ${input.address.replace(/\s*\n\s*/g, ', ')}`,
    '',
    'Articles :',
    ...input.lines.map((line) => `- ${line.name} — ${line.quantity} × ${formatFcfa(line.unitPrice)} = ${formatFcfa(line.lineTotal)}`),
    '',
    `Sous-total : ${formatFcfa(input.subtotal)}`,
    `Frais de livraison : ${input.deliveryFee === null ? 'à confirmer' : formatFcfa(input.deliveryFee)}`,
    `Total : ${input.total === null ? 'à confirmer (sous-total + frais de livraison)' : formatFcfa(input.total)}`,
    '',
    `Paiement : ${paymentTerms(input.zoneType, input.depositAmount)}`,
  ];
  if (input.note) lines.push('', `Note : ${input.note.replace(/\s*\n\s*/g, ' ')}`);
  return lines.join('\n');
}
