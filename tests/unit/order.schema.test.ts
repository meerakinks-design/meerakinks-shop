import { describe, expect, it } from 'vitest';
import { orderInputSchema, type OrderPayload } from '@/lib/validation/order.schema';

const KEY = '0b9d6f1e-6a43-4d6a-9d0e-3f6a5c2b7e11';
const base = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  idempotencyKey: KEY,
  items: [{ productId: 'prod_1', quantity: 2 }],
  firstName: 'Awa',
  lastName: 'Koné',
  phoneDialCode: '225',
  phone: '07 00 00 00 00',
  email: '',
  zoneType: 'ABIDJAN',
  deliveryZoneId: '',
  placeName: 'Cocody',
  city: '',
  address: 'Riviera Palmeraie, rue des jardins',
  addressDetails: '',
  customerNote: '',
  companyFax: '',
  ...overrides,
});

const fieldErrors = (input: unknown) => {
  const result = orderInputSchema.safeParse(input);
  return result.success ? null : result.error.flatten().fieldErrors;
};

describe('commande — cas valide', () => {
  it('normalise le téléphone et retire les champs vides', () => {
    const parsed = orderInputSchema.parse(base());
    expect(parsed.phoneE164).toBe('+2250700000000');
    expect(parsed.email).toBeUndefined();
    expect(parsed.deliveryZoneId).toBeUndefined();
    expect(parsed.addressDetails).toBeUndefined();
    expect(parsed.customerNote).toBeUndefined();
    expect(parsed.city).toBeUndefined();
  });

  it('nettoie les espaces et met l’email en minuscules', () => {
    const parsed = orderInputSchema.parse(base({ firstName: '  Awa  ', email: '  Awa@Example.COM ' }));
    expect(parsed.firstName).toBe('Awa');
    expect(parsed.email).toBe('awa@example.com');
  });

  it('accepte une zone choisie dans la liste sans nom saisi', () => {
    const parsed = orderInputSchema.parse(base({ placeName: '', deliveryZoneId: 'zone_1' }));
    expect(parsed.deliveryZoneId).toBe('zone_1');
  });

  it('garde les retours à la ligne de la note, normalisés', () => {
    const parsed = orderInputSchema.parse(base({ customerNote: 'Ligne 1\r\nLigne 2' }));
    expect(parsed.customerNote).toBe('Ligne 1\nLigne 2');
  });

  it('ne laisse passer AUCUN prix ni total envoyé par le navigateur (D-10)', () => {
    const parsed = orderInputSchema.parse(
      base({ price: 1, total: 1, subtotal: 1, deliveryFee: 0, upfrontAmount: 0, items: [{ productId: 'prod_1', quantity: 1, price: 1, unitPrice: 1 }] }),
    ) as Record<string, unknown>;
    for (const forbidden of ['price', 'total', 'subtotal', 'deliveryFee', 'upfrontAmount']) expect(parsed).not.toHaveProperty(forbidden);
    expect(parsed.items).toEqual([{ productId: 'prod_1', quantity: 1 }]);
  });

  it('utilise l’indicatif ivoirien par défaut', () => {
    const { phoneDialCode: _ignored, ...withoutDial } = base();
    expect(orderInputSchema.parse(withoutDial).phoneE164).toBe('+2250700000000');
  });
});

describe('commande — panier', () => {
  it('refuse un panier vide, une quantité hors limites et trop de lignes', () => {
    expect(fieldErrors(base({ items: [] }))?.items?.[0]).toBe('Votre panier est vide.');
    expect(fieldErrors(base({ items: [{ productId: 'p', quantity: 0 }] }))?.items).toBeDefined();
    expect(fieldErrors(base({ items: [{ productId: 'p', quantity: 21 }] }))?.items).toBeDefined();
    const many = Array.from({ length: 31 }, (_, index) => ({ productId: `p${index}`, quantity: 1 }));
    expect(fieldErrors(base({ items: many }))?.items).toBeDefined();
  });
  it('refuse deux lignes pour le même produit', () => {
    const errors = fieldErrors(base({ items: [{ productId: 'p', quantity: 1 }, { productId: 'p', quantity: 2 }] }));
    expect(errors?.items?.[0]).toContain('deux fois');
  });
});

describe('commande — identité et téléphone', () => {
  it('exige prénom, nom et téléphone, en français', () => {
    const errors = fieldErrors(base({ firstName: '', lastName: ' ', phone: '' }));
    expect(errors?.firstName?.[0]).toBe('Indiquez votre prénom.');
    expect(errors?.lastName?.[0]).toBe('Indiquez votre nom.');
    expect(errors?.phone?.[0]).toBe('Indiquez votre numéro de téléphone.');
  });
  it('refuse un nom d’une lettre et les caractères de contrôle', () => {
    expect(fieldErrors(base({ firstName: 'A' }))?.firstName).toBeDefined();
    expect(fieldErrors(base({ lastName: 'Ko\nné' }))?.lastName).toBeDefined();
    expect(fieldErrors(base({ firstName: 'x'.repeat(61) }))?.firstName).toBeDefined();
  });
  it('signale un numéro invalide sur le champ téléphone', () => {
    expect(fieldErrors(base({ phone: '07 00 00' }))?.phone?.[0]).toContain('10 chiffres');
    expect(fieldErrors(base({ phone: 'abc' }))?.phone).toBeDefined();
  });
  it('refuse un email mal formé', () => {
    expect(fieldErrors(base({ email: 'pas-un-email' }))?.email?.[0]).toBe('Adresse email invalide.');
  });
});

describe('commande — erreurs groupées', () => {
  it('remonte toutes les erreurs en une seule fois, téléphone compris (pas de correction en deux temps)', () => {
    const errors = fieldErrors(base({ firstName: '', phone: '07 00', items: [], address: '', placeName: '' }));
    expect(Object.keys(errors ?? {}).sort()).toEqual(['address', 'firstName', 'items', 'phone', 'placeName']);
  });
});

describe('commande — destination', () => {
  it('exige une destination : zone de la liste OU saisie libre', () => {
    expect(fieldErrors(base({ placeName: '', deliveryZoneId: '' }))?.placeName?.[0]).toBe('Indiquez votre commune.');
    expect(fieldErrors(base({ zoneType: 'INTERIOR', placeName: '' }))?.placeName?.[0]).toBe('Indiquez votre ville.');
    expect(fieldErrors(base({ zoneType: 'INTERNATIONAL', placeName: '', city: 'Paris' }))?.placeName?.[0]).toBe('Indiquez votre pays.');
  });
  it('exige la ville pour une commande à l’étranger', () => {
    expect(fieldErrors(base({ zoneType: 'INTERNATIONAL', placeName: 'France', city: '' }))?.city?.[0]).toBe('Indiquez votre ville.');
    expect(orderInputSchema.safeParse(base({ zoneType: 'INTERNATIONAL', placeName: 'France', city: 'Paris' })).success).toBe(true);
  });
  it('refuse une zone inconnue', () => {
    expect(fieldErrors(base({ zoneType: 'MARS' }))?.zoneType?.[0]).toBe('Choisissez une zone de livraison.');
  });
  it('exige une adresse assez précise', () => {
    expect(fieldErrors(base({ address: '' }))?.address?.[0]).toBe('Indiquez votre adresse de livraison.');
    expect(fieldErrors(base({ address: 'abc' }))?.address?.[0]).toContain('Précisez');
  });
});

describe('commande — clé d’idempotence et limites', () => {
  it('exige une clé valide', () => {
    expect(fieldErrors(base({ idempotencyKey: 'court' }))?.idempotencyKey).toBeDefined();
    expect(fieldErrors(base({ idempotencyKey: 'a'.repeat(81) }))?.idempotencyKey).toBeDefined();
    expect(fieldErrors(base({ idempotencyKey: 'clé avec espaces et accents é' + 'x'.repeat(10) }))?.idempotencyKey).toBeDefined();
    const { idempotencyKey: _removed, ...without } = base();
    expect(fieldErrors(without)?.idempotencyKey).toBeDefined();
  });
  it('plafonne la note', () => {
    expect(fieldErrors(base({ customerNote: 'x'.repeat(501) }))?.customerNote).toBeDefined();
    expect(orderInputSchema.safeParse(base({ customerNote: 'x'.repeat(500) })).success).toBe(true);
  });
  it('le type de charge utile accepte le formulaire tel quel', () => {
    const payload: OrderPayload = base() as unknown as OrderPayload;
    expect(payload.idempotencyKey).toBe(KEY);
  });
});
