import { describe, expect, it } from 'vitest';
import { netPaid, remainingToPay, type PaymentLine } from '@/lib/shop/payments';

const pay = (kind: PaymentLine['kind'], amount: number, voidedAt: Date | null = null): PaymentLine => ({ kind, amount, voidedAt });

describe('netPaid (RM-22, RM-23)', () => {
  it('additionne acompte, solde et paiement intégral', () => {
    expect(netPaid([pay('DEPOSIT', 2000), pay('BALANCE', 15000)])).toBe(17000);
    expect(netPaid([pay('FULL', 18000)])).toBe(18000);
  });
  it('soustrait les remboursements', () => {
    expect(netPaid([pay('FULL', 18000), pay('REFUND', 5000)])).toBe(13000);
  });
  it('ignore les paiements annulés (RM-21)', () => {
    expect(netPaid([pay('DEPOSIT', 2000), pay('BALANCE', 15000, new Date())])).toBe(2000);
    expect(netPaid([pay('REFUND', 5000, new Date()), pay('FULL', 18000)])).toBe(18000);
  });
  it('vaut 0 sans paiement', () => {
    expect(netPaid([])).toBe(0);
  });
});

describe('remainingToPay', () => {
  it('total − encaissé, jamais négatif', () => {
    expect(remainingToPay(18000, 2000)).toBe(16000);
    expect(remainingToPay(18000, 18000)).toBe(0);
    expect(remainingToPay(18000, 20000)).toBe(0);
  });
  it('total inconnu : « à confirmer » (null)', () => {
    expect(remainingToPay(null, 2000)).toBeNull();
  });
});
