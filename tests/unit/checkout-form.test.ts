import { describe, expect, it } from 'vitest';
import { IDEMPOTENCY_KEY_PATTERN } from '@/lib/constants/order';
import {
  buildOrderPayload,
  controlIdFor,
  createIdempotencyKey,
  emptyCheckoutValues,
  estimateCheckoutAmounts,
  firstInvalidField,
  toFieldErrors,
} from '@/lib/shop/checkout-form';
import { OTHER_DIAL_CODE } from '@/lib/shop/phone';
import { orderInputSchema } from '@/lib/validation/order.schema';

describe('valeurs initiales', () => {
  it('commence à Abidjan avec l’indicatif ivoirien et le champ piège vide', () => {
    const values = emptyCheckoutValues();
    expect(values.zoneType).toBe('ABIDJAN');
    expect(values.dialCode).toBe('225');
    expect(values.companyFax).toBe('');
  });
});

describe('createIdempotencyKey', () => {
  it('produit des clés valides et uniques', () => {
    const keys = new Set(Array.from({ length: 200 }, () => createIdempotencyKey()));
    expect(keys.size).toBe(200);
    for (const key of keys) expect(key).toMatch(IDEMPOTENCY_KEY_PATTERN);
  });
});

describe('buildOrderPayload', () => {
  const values = { ...emptyCheckoutValues(), firstName: 'Awa', lastName: 'Koné', phone: '07 00 00 00 00', placeName: 'Cocody', address: 'Riviera Palmeraie' };
  const items = [{ productId: 'prod_a', quantity: 2, name: 'ne doit pas partir', unitPrice: 1 }];

  it('n’envoie que des identifiants et des quantités : jamais de prix, de nom de produit ni de total (D-10)', () => {
    const payload = buildOrderPayload(values, items, 'cle-de-test-0123456789');
    expect(payload.items).toEqual([{ productId: 'prod_a', quantity: 2 }]);
    const serialized = JSON.stringify(payload);
    for (const forbidden of ['unitPrice', 'price', 'total', 'subtotal', 'ne doit pas partir']) expect(serialized).not.toContain(forbidden);
  });

  it('produit une charge utile que le schéma accepte', () => {
    expect(orderInputSchema.safeParse(buildOrderPayload(values, items, createIdempotencyKey())).success).toBe(true);
  });

  it('utilise l’indicatif saisi quand « Autre pays » est choisi', () => {
    const payload = buildOrderPayload({ ...values, dialCode: OTHER_DIAL_CODE, otherDialCode: '971', phone: '50 123 4567' }, items, createIdempotencyKey());
    expect(payload.phoneDialCode).toBe('971');
    expect(orderInputSchema.parse(payload).phoneE164).toBe('+971501234567');
  });
});

describe('toFieldErrors', () => {
  it('garde le premier message de chaque champ du formulaire', () => {
    const { errors, general } = toFieldErrors({ firstName: ['Indiquez votre prénom.', 'autre'], phone: ['Numéro invalide'], email: undefined });
    expect(errors).toEqual({ firstName: 'Indiquez votre prénom.', phone: 'Numéro invalide' });
    expect(general).toBeNull();
  });
  it('transforme ce qui n’est pas un champ (panier, clé) en message général', () => {
    const { errors, general } = toFieldErrors({ items: ['Votre panier est vide.'], idempotencyKey: ['Clé invalide'] });
    expect(errors).toEqual({});
    expect(general).toBe('Votre panier est vide.');
  });
  it('accepte l’absence d’erreurs', () => {
    expect(toFieldErrors(undefined)).toEqual({ errors: {}, general: null });
  });
});

describe('focus sur le premier champ invalide', () => {
  it('suit l’ordre de la page, pas l’ordre des erreurs', () => {
    expect(firstInvalidField({ address: 'x', lastName: 'y', phone: 'z' })).toBe('lastName');
    expect(firstInvalidField({})).toBeNull();
  });
  it('la destination (liste ou champ libre) partage un seul identifiant', () => {
    expect(controlIdFor('p', 'deliveryZoneId')).toBe(controlIdFor('p', 'placeName'));
    expect(controlIdFor('p', 'address')).toBe('p-address');
  });
});

describe('estimateCheckoutAmounts', () => {
  it('Abidjan sans frais connus : total à confirmer, acompte annoncé', () => {
    expect(estimateCheckoutAmounts({ subtotal: 24000, zoneType: 'ABIDJAN', zone: null, depositAmount: 2000 })).toEqual({ deliveryFee: null, total: null, upfrontAmount: 2000 });
  });
  it('zone avec frais : total calculé', () => {
    const zone = { id: 'z', name: 'Cocody', fee: 1500 };
    expect(estimateCheckoutAmounts({ subtotal: 24000, zoneType: 'ABIDJAN', zone, depositAmount: 2000 })).toEqual({ deliveryFee: 1500, total: 25500, upfrontAmount: 2000 });
  });
  it('hors Abidjan : montant à régler = total quand les frais sont connus, sinon inconnu', () => {
    expect(estimateCheckoutAmounts({ subtotal: 24000, zoneType: 'INTERIOR', zone: { id: 'z', name: 'Bouaké', fee: 3000 }, depositAmount: 2000 }).upfrontAmount).toBe(27000);
    expect(estimateCheckoutAmounts({ subtotal: 24000, zoneType: 'INTERNATIONAL', zone: null, depositAmount: 2000 }).upfrontAmount).toBeNull();
  });
});
