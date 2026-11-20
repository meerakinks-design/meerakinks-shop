// Montants d'une commande : fonctions pures partagées par le serveur (calcul officiel) et le
// formulaire (estimation affichée). Entiers FCFA uniquement ; on n'invente jamais des frais (RM-03).
import type { ZoneTypeValue } from '@/lib/constants/order';

/** total = sous-total + frais. Frais inconnus (null) → total inconnu (null) : « à confirmer ». */
export function computeTotal(subtotal: number, deliveryFee: number | null): number | null {
  return deliveryFee === null ? null : subtotal + deliveryFee;
}

interface UpfrontContext {
  depositAmount: number;
  subtotal: number;
  total: number | null;
}

/**
 * Montant à régler pour confirmer la commande (RM-05, RM-06).
 *  - Abidjan : l'acompte, sans jamais dépasser la valeur de la commande.
 *  - Intérieur et étranger : paiement intégral, frais inclus ; null tant que les frais ne sont pas fixés.
 */
export function computeUpfrontAmount(zoneType: ZoneTypeValue, context: UpfrontContext): number | null {
  if (zoneType === 'ABIDJAN') return Math.min(context.depositAmount, context.total ?? context.subtotal);
  return context.total;
}

/**
 * Statut de paiement à la création : acompte attendu à Abidjan ; ailleurs « à confirmer » (la vendeuse
 * fixe le montant exact, RM-06). Aucun paiement n'est jamais présenté comme reçu à ce stade (RM-10).
 */
export function initialPaymentStatus(zoneType: ZoneTypeValue): 'DEPOSIT_DUE' | 'TO_CONFIRM' {
  return zoneType === 'ABIDJAN' ? 'DEPOSIT_DUE' : 'TO_CONFIRM';
}
