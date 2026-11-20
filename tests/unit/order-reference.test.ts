import { describe, expect, it } from 'vitest';
import { ORDER_REFERENCE_PATTERN } from '@/lib/constants/order';
import { generateOrderReference, randomCode, receiptNumberFor } from '@/server/services/order-reference';

describe('référence de commande', () => {
  it('respecte le format CMD-XXXXXXXX de l’alphabet de Crockford', () => {
    for (let index = 0; index < 500; index += 1) expect(generateOrderReference()).toMatch(ORDER_REFERENCE_PATTERN);
  });
  it('n’utilise jamais de lettre ambiguë (I, L, O, U)', () => {
    const sample = Array.from({ length: 300 }, () => randomCode(8)).join('');
    expect(sample).not.toMatch(/[ILOU]/);
  });
  it('n’est pas séquentielle : aucune collision sur un grand échantillon', () => {
    const references = new Set(Array.from({ length: 5000 }, () => generateOrderReference()));
    expect(references.size).toBe(5000);
  });
  it('le motif refuse les références mal formées', () => {
    for (const bad of ['', 'CMD-', 'CMD-1234567', 'CMD-123456789', 'cmd-7K3M9QXP', 'CMD-7K3M9QXI', 'CMD-7K3M9QXO', 'CMD-7K3M 9QX', 'REC-7K3M9QXP']) {
      expect(ORDER_REFERENCE_PATTERN.test(bad)).toBe(false);
    }
    expect(ORDER_REFERENCE_PATTERN.test('CMD-7K3M9QXP')).toBe(true);
  });
  it('le numéro de reçu dérive de la référence (RM-24)', () => {
    expect(receiptNumberFor('CMD-7K3M9QXP')).toBe('REC-7K3M9QXP');
  });
});
