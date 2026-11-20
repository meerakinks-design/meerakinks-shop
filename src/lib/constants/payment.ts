// Types et modes de paiement (alignés sur les enums Prisma PaymentKind et PaymentMethod : un test le vérifie).

export const PAYMENT_KINDS = ['DEPOSIT', 'BALANCE', 'FULL', 'REFUND'] as const;
export type PaymentKindValue = (typeof PAYMENT_KINDS)[number];

export const PAYMENT_KIND_LABELS: Record<PaymentKindValue, string> = {
  DEPOSIT: 'Acompte',
  BALANCE: 'Solde',
  FULL: 'Paiement intégral',
  REFUND: 'Remboursement',
};

export const PAYMENT_METHODS = ['WAVE', 'CASH', 'OTHER'] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  WAVE: 'Wave',
  CASH: 'Espèces',
  OTHER: 'Autre',
};
