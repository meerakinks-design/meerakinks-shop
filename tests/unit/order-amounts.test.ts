import { describe, expect, it } from 'vitest';
import { computeTotal, computeUpfrontAmount, initialPaymentStatus } from '@/lib/shop/order-amounts';
import { computeTotal as computeTotalFromPricing } from '@/server/services/pricing';

describe('computeTotal', () => {
  it('additionne sous-total et frais ; frais inconnus = total inconnu (RM-03)', () => {
    expect(computeTotal(15000, 2000)).toBe(17000);
    expect(computeTotal(15000, 0)).toBe(15000);
    expect(computeTotal(15000, null)).toBeNull();
  });
  it('reste exporté par les services de prix', () => {
    expect(computeTotalFromPricing).toBe(computeTotal);
  });
});

describe('computeUpfrontAmount', () => {
  it('Abidjan : l’acompte, plafonné à la valeur de la commande', () => {
    expect(computeUpfrontAmount('ABIDJAN', { depositAmount: 2000, subtotal: 15000, total: null })).toBe(2000);
    expect(computeUpfrontAmount('ABIDJAN', { depositAmount: 2000, subtotal: 1500, total: null })).toBe(1500);
    expect(computeUpfrontAmount('ABIDJAN', { depositAmount: 2000, subtotal: 1000, total: 1500 })).toBe(1500);
  });
  it('hors Abidjan : paiement intégral, inconnu tant que les frais ne sont pas fixés', () => {
    expect(computeUpfrontAmount('INTERIOR', { depositAmount: 2000, subtotal: 15000, total: 18000 })).toBe(18000);
    expect(computeUpfrontAmount('INTERNATIONAL', { depositAmount: 2000, subtotal: 15000, total: null })).toBeNull();
  });
});

describe('initialPaymentStatus', () => {
  it('acompte attendu à Abidjan, à confirmer ailleurs — jamais « payé » (RM-10)', () => {
    expect(initialPaymentStatus('ABIDJAN')).toBe('DEPOSIT_DUE');
    expect(initialPaymentStatus('INTERIOR')).toBe('TO_CONFIRM');
    expect(initialPaymentStatus('INTERNATIONAL')).toBe('TO_CONFIRM');
  });
});
