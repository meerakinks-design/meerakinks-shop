import { describe, expect, it } from 'vitest';
import { ANONYMIZED_ADDRESS, ANONYMIZED_FULL_NAME, anonymizedPhone } from '@/lib/constants/retention';
import { anonymizeReceiptData, anonymizedCustomerFields, retentionCutoff } from '@/lib/retention';
import { buildReceiptData, parseReceiptData } from '@/server/services/receipt.service';

describe('retentionCutoff', () => {
  it('recule du nombre de mois demandé en gardant le jour et l’heure', () => {
    expect(retentionCutoff(new Date('2026-11-20T14:30:15.250Z'), 36).toISOString()).toBe('2023-11-20T14:30:15.250Z');
    expect(retentionCutoff(new Date('2026-11-20T00:00:00Z'), 1).toISOString()).toBe('2026-10-20T00:00:00.000Z');
  });

  it('traverse les changements d’année', () => {
    expect(retentionCutoff(new Date('2026-01-15T00:00:00Z'), 2).toISOString()).toBe('2025-11-15T00:00:00.000Z');
    expect(retentionCutoff(new Date('2026-01-15T00:00:00Z'), 13).toISOString()).toBe('2024-12-15T00:00:00.000Z');
    expect(retentionCutoff(new Date('2026-12-31T00:00:00Z'), 12).toISOString()).toBe('2025-12-31T00:00:00.000Z');
  });

  it('ramène le jour à la fin du mois visé : jamais de débordement sur le mois suivant', () => {
    expect(retentionCutoff(new Date('2026-03-31T00:00:00Z'), 1).toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(retentionCutoff(new Date('2024-03-31T00:00:00Z'), 1).toISOString()).toBe('2024-02-29T00:00:00.000Z'); // année bissextile
    expect(retentionCutoff(new Date('2026-05-31T00:00:00Z'), 1).toISOString()).toBe('2026-04-30T00:00:00.000Z');
  });
});

describe('anonymizedCustomerFields', () => {
  it('remplace nom, téléphone et email, et date l’opération', () => {
    const now = new Date('2026-11-20T10:00:00Z');
    expect(anonymizedCustomerFields('cus_1', now)).toEqual({
      fullName: ANONYMIZED_FULL_NAME,
      phone: 'anon-cus_1',
      email: null,
      anonymizedAt: now,
    });
  });

  it('donne un téléphone distinct à chaque fiche (la colonne est unique) qui ne ressemble à aucun numéro réel', () => {
    expect(anonymizedPhone('a')).not.toBe(anonymizedPhone('b'));
    expect(anonymizedPhone('cmabc123')).not.toMatch(/^\+?\d+$/);
  });
});

describe('anonymizeReceiptData', () => {
  const receipt = buildReceiptData({
    issuedAt: new Date('2026-10-01T10:00:00Z'),
    shop: { name: 'Awa Beauty', legalName: null, address: null, contactPhone: null, contactEmail: null },
    depositAmount: 2000,
    customer: { fullName: 'Awa Koné', phone: '+2250700000000', email: 'awa@example.com' },
    delivery: { zoneType: 'ABIDJAN', country: 'Côte d’Ivoire', city: 'Cocody', address: 'Riviera 3, rue des Jardins, villa 12' },
    lines: [{ name: 'Gel définition', unitPrice: 5000, quantity: 2, lineTotal: 10000 }],
    subtotal: 10000,
    deliveryFee: 1500,
    total: 11500,
    upfrontAmount: 2000,
  });

  it('efface le client et l’adresse, et rien d’autre : le reçu garde ses montants, ses lignes et ses dates', () => {
    const result = anonymizeReceiptData(receipt)!;
    expect(result.customer).toEqual({ fullName: ANONYMIZED_FULL_NAME, phone: '', email: null });
    expect(result.delivery).toEqual({ zoneType: 'ABIDJAN', country: 'Côte d’Ivoire', city: 'Cocody', address: ANONYMIZED_ADDRESS });
    expect(result.lines).toEqual(receipt.lines);
    expect(result.amounts).toEqual(receipt.amounts);
    expect(result.issuedAt).toBe(receipt.issuedAt);
    expect(result.paymentTerms).toBe(receipt.paymentTerms);
  });

  it('ne laisse aucune donnée personnelle dans le JSON résultant', () => {
    const text = JSON.stringify(anonymizeReceiptData(receipt));
    for (const secret of ['Awa', 'Koné', '0700000000', 'awa@example.com', 'Riviera', 'villa 12']) {
      if (secret === 'Awa') expect(text).not.toContain('"Awa"'); // « Awa Beauty » est le nom de la boutique, pas du client
      else expect(text).not.toContain(secret);
    }
  });

  it('reste lisible par le générateur de reçu (même structure validée)', () => {
    expect(() => parseReceiptData(anonymizeReceiptData(receipt))).not.toThrow();
  });

  it('ne modifie pas l’objet d’origine', () => {
    anonymizeReceiptData(receipt);
    expect(receipt.customer.fullName).toBe('Awa Koné');
  });

  it('renvoie null pour un contenu illisible plutôt que de le laisser tel quel', () => {
    for (const value of [null, undefined, 'texte', 42, ['a']]) expect(anonymizeReceiptData(value)).toBeNull();
  });

  it('pose l’adresse effacée même quand la livraison manque', () => {
    expect(anonymizeReceiptData({ version: 1 })).toMatchObject({ delivery: { address: ANONYMIZED_ADDRESS } });
  });
});
