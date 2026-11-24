import { describe, expect, it } from 'vitest';
import { anonymizeReceiptData } from '@/lib/retention';
import { parseReceiptData } from '@/server/services/receipt.service';

// Les reçus déjà enregistrés (colonne JSON, figée) portent encore « firstName » et « lastName » : le champ « Nom complet »
// ne doit en abîmer aucun (RM-24 : un ancien reçu ne change jamais).
const base = {
  version: 1,
  issuedAt: '2026-11-20T10:00:00.000Z',
  shop: { name: 'Awa Beauty', legalName: null, address: null, contactPhone: null, contactEmail: null },
  delivery: { zoneType: 'ABIDJAN', country: 'Côte d’Ivoire', city: 'Abidjan', address: 'Riviera' },
  lines: [{ name: 'Sérum éclat', unitPrice: 10000, quantity: 1, lineTotal: 10000 }],
  amounts: { currency: 'XOF', subtotal: 10000, deliveryFee: null, total: null, upfrontAmount: 2000 },
  paymentTerms: 'Acompte de 2 000 FCFA.',
};

describe('lecture des reçus : ancien format (prénom + nom) et nouveau (nom complet)', () => {
  it('un reçu enregistré avant le champ « Nom complet » se relit avec le nom complet', () => {
    const old = { ...base, customer: { firstName: 'Awa', lastName: 'Koné', phone: '+2250700000000', email: 'awa@example.com' } };
    expect(parseReceiptData(old).customer).toEqual({ fullName: 'Awa Koné', phone: '+2250700000000', email: 'awa@example.com' });
  });

  it('un reçu au nouveau format se relit tel quel', () => {
    const fresh = { ...base, customer: { fullName: 'Awa Koné', phone: '+2250700000000', email: null } };
    expect(parseReceiptData(fresh).customer).toEqual({ fullName: 'Awa Koné', phone: '+2250700000000', email: null });
  });

  it('un ancien reçu déjà anonymisé (« Client » + « anonymisé ») reste lisible', () => {
    const anonymizedOld = { ...base, customer: { firstName: 'Client', lastName: 'anonymisé', phone: '', email: null } };
    expect(parseReceiptData(anonymizedOld).customer.fullName).toBe('Client anonymisé');
  });

  it('l’anonymisation d’un reçu au nouveau format donne un reçu qui se relit', () => {
    const fresh = { ...base, customer: { fullName: 'Awa Koné', phone: '+2250700000000', email: null } };
    const anonymized = anonymizeReceiptData(fresh);
    expect(anonymized).not.toBeNull();
    expect(parseReceiptData(anonymized).customer).toEqual({ fullName: 'Client anonymisé', phone: '', email: null });
  });

  it('un client sans aucun nom est refusé (reçu illisible)', () => {
    expect(() => parseReceiptData({ ...base, customer: { phone: '+2250700000000', email: null } })).toThrow();
  });
});
