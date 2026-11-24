import { describe, expect, it } from 'vitest';
import { deliveryFeeSchema, deliveryStatusInputSchema, internalNoteSchema, parseOrderListQuery, paymentInputSchema, voidPaymentSchema } from '@/lib/validation/order-admin.schema';

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) => (result.success ? [] : (result.error?.issues.map((issue) => issue.message) ?? []));

describe('deliveryStatusInputSchema', () => {
  it('accepte un statut connu et une note facultative nettoyée', () => {
    expect(deliveryStatusInputSchema.parse({ status: 'CONFIRMED', note: '  Appelée  ' })).toEqual({ status: 'CONFIRMED', note: 'Appelée' });
    expect(deliveryStatusInputSchema.parse({ status: 'CANCELLED', note: '   ' })).toEqual({ status: 'CANCELLED', note: undefined });
  });
  it('refuse un statut inconnu', () => {
    expect(deliveryStatusInputSchema.safeParse({ status: 'LOST' }).success).toBe(false);
  });
});

describe('paymentInputSchema', () => {
  const good = { kind: 'DEPOSIT', method: 'WAVE', amount: 2000 };
  it('accepte un acompte', () => {
    expect(paymentInputSchema.parse(good)).toMatchObject({ kind: 'DEPOSIT', method: 'WAVE', amount: 2000 });
  });
  it('refuse un montant nul, négatif, décimal ou en texte (FCFA entiers, RM-20)', () => {
    for (const amount of [0, -5, 10.5, '2000']) expect(paymentInputSchema.safeParse({ ...good, amount }).success).toBe(false);
  });
  it('exige le motif d’un remboursement', () => {
    const refund = { kind: 'REFUND', method: 'WAVE', amount: 2000 };
    expect(messages(paymentInputSchema.safeParse(refund))).toContain('Indique le motif du remboursement.');
    expect(paymentInputSchema.safeParse({ ...refund, note: 'Annulation' }).success).toBe(true);
  });
  it('lit la date d’encaissement mais refuse le futur', () => {
    expect(paymentInputSchema.parse({ ...good, receivedAt: '2026-11-20' }).receivedAt).toBeInstanceOf(Date);
    expect(paymentInputSchema.parse({ ...good, receivedAt: '' }).receivedAt).toBeUndefined();
    expect(paymentInputSchema.safeParse({ ...good, receivedAt: '2999-01-01' }).success).toBe(false);
    expect(paymentInputSchema.safeParse({ ...good, receivedAt: 'pas une date' }).success).toBe(false);
  });
  it('refuse un type ou un mode inconnu', () => {
    expect(paymentInputSchema.safeParse({ ...good, kind: 'GIFT' }).success).toBe(false);
    expect(paymentInputSchema.safeParse({ ...good, method: 'BITCOIN' }).success).toBe(false);
  });
});

describe('voidPaymentSchema, deliveryFeeSchema, internalNoteSchema', () => {
  it('le motif d’annulation est obligatoire', () => {
    expect(voidPaymentSchema.safeParse({ reason: ' ' }).success).toBe(false);
    expect(voidPaymentSchema.parse({ reason: ' Saisi en double ' })).toEqual({ reason: 'Saisi en double' });
  });
  it('les frais sont un entier positif ou nul (livraison offerte)', () => {
    expect(deliveryFeeSchema.parse({ fee: 0 })).toEqual({ fee: 0 });
    expect(deliveryFeeSchema.safeParse({ fee: -1 }).success).toBe(false);
    expect(deliveryFeeSchema.safeParse({ fee: 1500.5 }).success).toBe(false);
  });
  it('une note vide devient « pas de note »', () => {
    expect(internalNoteSchema.parse({ note: '  ' })).toEqual({ note: null });
    expect(internalNoteSchema.parse({ note: ' À rappeler ' })).toEqual({ note: 'À rappeler' });
    expect(internalNoteSchema.safeParse({ note: 'x'.repeat(1001) }).success).toBe(false);
  });
});

describe('parseOrderListQuery', () => {
  it('traduit les mots de l’adresse en filtres', () => {
    expect(parseOrderListQuery({ statut: 'a-confirmer', paiement: 'a-encaisser', q: ' Awa ', page: '3' })).toEqual({
      deliveryKey: 'a-confirmer',
      delivery: 'PENDING',
      paymentKey: 'a-encaisser',
      payment: ['TO_CONFIRM', 'DEPOSIT_DUE'],
      q: 'Awa',
      page: 3,
    });
  });
  it('ignore sans erreur une valeur inconnue ou périmée', () => {
    expect(parseOrderListQuery({ statut: 'inconnu', paiement: ['x'], page: '-2' })).toEqual({ q: '', page: 1 });
    // Un paramètre répété (?q=a&q=b) : la première valeur compte (c'est ce que fait le code, `firstValue`).
    expect(parseOrderListQuery({ q: ['a', 'b'] })).toEqual({ q: 'a', page: 1 });
    expect(parseOrderListQuery({})).toEqual({ q: '', page: 1 });
  });
  it('ignore les noms hérités de JavaScript (constructor, toString…)', () => {
    expect(parseOrderListQuery({ statut: 'constructor', paiement: 'toString' })).toEqual({ q: '', page: 1 });
  });
  it('borne la recherche à 80 caractères', () => {
    expect(parseOrderListQuery({ q: 'x'.repeat(200) }).q).toHaveLength(80);
  });
});
