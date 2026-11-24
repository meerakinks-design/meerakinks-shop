import { describe, expect, it } from 'vitest';
import { buildOrderMessage, type OrderMessageInput } from '@/lib/shop/order-message';
import { formatFcfa } from '@/lib/money';
import { buildReceiptData, type ReceiptInput } from '@/server/services/receipt.service';

const message = (overrides: Partial<OrderMessageInput> = {}): string =>
  buildOrderMessage({
    reference: 'CMD-7K3M9QXP',
    zoneType: 'ABIDJAN',
    placeLabel: 'Cocody (Abidjan)',
    lines: [
      { name: 'Sérum éclat', quantity: 2, unitPrice: 10000, lineTotal: 20000 },
      { name: 'Savon noir', quantity: 1, unitPrice: 4000, lineTotal: 4000 },
    ],
    subtotal: 24000,
    deliveryFee: null,
    total: null,
    upfrontAmount: 2000,
    storeName: 'Awa Beauty',
    customerName: 'Awa Koné',
    phone: '+225 07 00 00 00 00',
    address: 'Riviera Palmeraie\nPortail bleu',
    note: null,
    depositAmount: 2000,
    ...overrides,
  });

describe('message WhatsApp', () => {
  it('contient la référence, l’identité, le téléphone, la destination, l’adresse et les articles (§6.4)', () => {
    const text = message();
    expect(text).toContain('Bonjour, je viens de passer la commande CMD-7K3M9QXP sur Awa Beauty.');
    expect(text).toContain('Client : Awa Koné');
    expect(text).toContain('Téléphone : +225 07 00 00 00 00');
    expect(text).toContain('Livraison : Cocody (Abidjan)');
    expect(text).toContain('Adresse : Riviera Palmeraie, Portail bleu');
    expect(text).toContain(`- Sérum éclat — 2 × ${formatFcfa(10000)} = ${formatFcfa(20000)}`);
    expect(text).toContain(`- Savon noir — 1 × ${formatFcfa(4000)} = ${formatFcfa(4000)}`);
    expect(text).toContain(`Sous-total : ${formatFcfa(24000)}`);
  });

  it('frais et total inconnus : « à confirmer », jamais un chiffre inventé (RM-03)', () => {
    const text = message();
    expect(text).toContain('Frais de livraison : à confirmer');
    expect(text).toContain('Total : à confirmer');
  });

  it('frais connus : affiche les frais et le total', () => {
    const text = message({ deliveryFee: 1500, total: 25500 });
    expect(text).toContain(`Frais de livraison : ${formatFcfa(1500)}`);
    expect(text).toContain(`Total : ${formatFcfa(25500)}`);
    expect(text).not.toContain('à confirmer');
  });

  it('annonce l’acompte à Abidjan et le paiement intégral ailleurs (RM-05, RM-06)', () => {
    expect(message()).toContain(`acompte de ${formatFcfa(2000)}`);
    const outside = message({ zoneType: 'INTERIOR', placeLabel: 'Bouaké, Côte d’Ivoire' });
    expect(outside).toContain('paiement intégral avant expédition');
    expect(outside).not.toContain('acompte');
  });

  it('ajoute la note du client sur une seule ligne, sinon rien', () => {
    expect(message()).not.toContain('Note :');
    expect(message({ note: 'Appelez avant\nde passer' })).toContain('Note : Appelez avant de passer');
  });

  it('ne contient jamais de numéro de paiement (RM-08)', () => {
    expect(message()).not.toMatch(/wave\s*:?\s*\+?\d/i);
  });
});

const receiptInput = (): ReceiptInput => ({
  issuedAt: new Date('2026-11-17T10:00:00.000Z'),
  shop: { name: 'Awa Beauty', legalName: 'Awa Beauty SARL', address: 'Abidjan', contactPhone: null, contactEmail: null },
  depositAmount: 2000,
  customer: { fullName: 'Awa Koné', phone: '+2250700000000', email: null },
  delivery: { zoneType: 'ABIDJAN', country: 'Côte d’Ivoire', city: 'Cocody', address: 'Riviera Palmeraie' },
  lines: [{ name: 'Sérum éclat', unitPrice: 10000, quantity: 2, lineTotal: 20000 }],
  subtotal: 20000,
  deliveryFee: null,
  total: null,
  upfrontAmount: 2000,
});

describe('données du reçu (RM-24)', () => {
  it('fige la boutique, le client, la livraison, les lignes et les montants', () => {
    const receipt = buildReceiptData(receiptInput());
    expect(receipt.version).toBe(1);
    expect(receipt.issuedAt).toBe('2026-11-17T10:00:00.000Z');
    expect(receipt.amounts).toEqual({ currency: 'XOF', subtotal: 20000, deliveryFee: null, total: null, upfrontAmount: 2000 });
    expect(receipt.paymentTerms).toContain('acompte');
  });

  it('est une copie : modifier ensuite les données sources ne change pas le reçu', () => {
    const input = receiptInput();
    const receipt = buildReceiptData(input);
    input.customer.fullName = 'Autre';
    input.lines[0]!.name = 'Produit renommé';
    input.shop.name = 'Autre boutique';
    expect(receipt.customer.fullName).toBe('Awa Koné');
    expect(receipt.lines[0]?.name).toBe('Sérum éclat');
    expect(receipt.shop.name).toBe('Awa Beauty');
  });

  it('est du JSON pur (stockable tel quel) et ne contient aucun numéro de paiement', () => {
    const receipt = buildReceiptData(receiptInput());
    expect(JSON.parse(JSON.stringify(receipt))).toEqual(receipt);
    expect(JSON.stringify(receipt).toLowerCase()).not.toContain('wave');
  });
});
