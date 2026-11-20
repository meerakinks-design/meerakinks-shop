import type { PaymentKindValue } from '@/lib/constants/payment';

export interface PaymentLine {
  kind: PaymentKindValue;
  /** FCFA, entier, toujours positif : le signe vient du type (RM-20). */
  amount: number;
  /** Un paiement annulé reste en base (RM-21) mais ne compte plus. */
  voidedAt: Date | null;
}

/** Total encaissé = paiements non annulés, remboursements soustraits (RM-22, RM-23). */
export function netPaid(payments: readonly PaymentLine[]): number {
  return payments.reduce((sum, payment) => {
    if (payment.voidedAt) return sum;
    return payment.kind === 'REFUND' ? sum - payment.amount : sum + payment.amount;
  }, 0);
}

/** Reste à payer ; null tant que le total n'est pas fixé (« à confirmer »), jamais négatif. */
export function remainingToPay(total: number | null, paid: number): number | null {
  return total === null ? null : Math.max(total - paid, 0);
}
