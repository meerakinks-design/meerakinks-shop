import { z } from 'zod';
import {
  ADMIN_INTERNAL_NOTE_MAX,
  ADMIN_NOTE_MAX,
  ADMIN_PAGE_SIZE,
  DELIVERY_FEE_MAX,
  ORDER_DELIVERY_FILTERS,
  ORDER_PAYMENT_FILTERS,
  PAYMENT_MAX_AMOUNT,
  PAYMENT_NOTE_MAX,
  type OrderDeliveryFilterKey,
  type OrderPaymentFilterKey,
} from '@/lib/constants/admin-orders';
import { DELIVERY_STATUSES } from '@/lib/constants/order-status';
import { PAYMENT_KINDS, PAYMENT_METHODS } from '@/lib/constants/payment';

// Schémas du traitement des commandes (back-office). Les messages sont ceux que la vendeuse lira.

/** Texte facultatif : espaces retirés, vide = absent. */
const optionalText = (max: number, tooLong: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() || undefined : value),
    z.string().max(max, tooLong).optional(),
  );

const amount = z
  .number({ required_error: 'Renseigne le montant.', invalid_type_error: 'Le montant doit être un nombre.' })
  .int('Le montant doit être un nombre entier de FCFA.')
  .positive('Le montant doit être supérieur à 0.')
  .max(PAYMENT_MAX_AMOUNT, 'Ce montant est trop élevé.');

export const deliveryStatusInputSchema = z.object({
  status: z.enum(DELIVERY_STATUSES, { errorMap: () => ({ message: 'Choisis un statut valide.' }) }),
  note: optionalText(ADMIN_NOTE_MAX, `La note ne peut pas dépasser ${ADMIN_NOTE_MAX} caractères.`),
});
export type DeliveryStatusInput = z.infer<typeof deliveryStatusInputSchema>;

export const paymentInputSchema = z
  .object({
    kind: z.enum(PAYMENT_KINDS, { errorMap: () => ({ message: 'Choisis le type de paiement.' }) }),
    method: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: 'Choisis le mode de paiement.' }) }),
    amount,
    // Date de l'encaissement : aujourd'hui par défaut ; on ne saisit pas dans le futur (un jour de marge pour le décalage horaire).
    receivedAt: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z.coerce
        .date({ errorMap: () => ({ message: 'Cette date n’est pas valide.' }) })
        .refine((date) => date.getTime() <= Date.now() + 24 * 60 * 60 * 1000, 'La date ne peut pas être dans le futur.')
        .optional(),
    ),
    note: optionalText(PAYMENT_NOTE_MAX, `La note ne peut pas dépasser ${PAYMENT_NOTE_MAX} caractères.`),
  })
  // Un remboursement s'explique : c'est la seule trace du pourquoi (RM-22).
  .refine((value) => value.kind !== 'REFUND' || Boolean(value.note), { path: ['note'], message: 'Indique le motif du remboursement.' });
export type PaymentInput = z.infer<typeof paymentInputSchema>;

export const voidPaymentSchema = z.object({
  reason: z
    .string({ required_error: 'Indique pourquoi ce paiement est annulé.' })
    .trim()
    .min(3, 'Indique pourquoi ce paiement est annulé.')
    .max(PAYMENT_NOTE_MAX, `Le motif ne peut pas dépasser ${PAYMENT_NOTE_MAX} caractères.`),
});
export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>;

export const deliveryFeeSchema = z.object({
  fee: z
    .number({ required_error: 'Renseigne les frais.', invalid_type_error: 'Les frais doivent être un nombre.' })
    .int('Les frais doivent être un nombre entier de FCFA.')
    .min(0, 'Les frais ne peuvent pas être négatifs.')
    .max(DELIVERY_FEE_MAX, 'Ces frais sont trop élevés.'),
});
export type DeliveryFeeInput = z.infer<typeof deliveryFeeSchema>;

export const internalNoteSchema = z.object({
  note: z
    .string({ required_error: 'La note est manquante.' })
    .trim()
    .max(ADMIN_INTERNAL_NOTE_MAX, `La note ne peut pas dépasser ${ADMIN_INTERNAL_NOTE_MAX} caractères.`)
    .transform((value) => (value === '' ? null : value)),
});
export type InternalNoteInput = z.infer<typeof internalNoteSchema>;

// --- Liste des commandes : paramètres d'adresse (jamais de confiance : tout est revalidé) ----------------------------

const firstValue = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

export interface OrderListQuery {
  delivery?: (typeof ORDER_DELIVERY_FILTERS)[OrderDeliveryFilterKey];
  deliveryKey?: OrderDeliveryFilterKey;
  payment?: (typeof ORDER_PAYMENT_FILTERS)[OrderPaymentFilterKey];
  paymentKey?: OrderPaymentFilterKey;
  q: string;
  page: number;
}

/** Lit les paramètres de la liste ; une valeur inconnue est ignorée (pas d'erreur pour un lien périmé). */
export function parseOrderListQuery(params: Record<string, unknown>): OrderListQuery {
  const statut = firstValue(params.statut);
  const paiement = firstValue(params.paiement);
  const q = firstValue(params.q);
  const page = Number(firstValue(params.page));

  const deliveryKey = typeof statut === 'string' && Object.hasOwn(ORDER_DELIVERY_FILTERS, statut) ? (statut as OrderDeliveryFilterKey) : undefined;
  const paymentKey = typeof paiement === 'string' && Object.hasOwn(ORDER_PAYMENT_FILTERS, paiement) ? (paiement as OrderPaymentFilterKey) : undefined;
  return {
    ...(deliveryKey ? { deliveryKey, delivery: ORDER_DELIVERY_FILTERS[deliveryKey] } : {}),
    ...(paymentKey ? { paymentKey, payment: ORDER_PAYMENT_FILTERS[paymentKey] } : {}),
    q: typeof q === 'string' ? q.trim().slice(0, 80) : '',
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1,
  };
}

export const ORDER_LIST_PAGE_SIZE = ADMIN_PAGE_SIZE;
