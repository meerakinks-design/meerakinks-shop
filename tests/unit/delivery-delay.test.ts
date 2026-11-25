import { describe, expect, it } from 'vitest';
import { faqItems } from '@/content/faq';
import {
  DEFAULT_DELAYS,
  DELAY_DISCLAIMER,
  deliveryNoticeLines,
  effectiveDelay,
  faqDelayAnswer,
  formatDelay,
  mergeDelays,
  summarizeDelays,
  zoneDelay,
} from '@/lib/shop/delivery-delay';
import { delayForDestination } from '@/lib/shop/zones';
import { deliveryNotesSchema, deliveryZoneInputSchema } from '@/lib/validation/delivery-zone.schema';
import { buildOrderMessage } from '@/lib/shop/order-message';

describe('formatage des délais (P-56)', () => {
  it('affiche jusqu’à 72 h en heures, au-delà en jours', () => {
    expect(formatDelay({ minHours: 24, maxHours: 24 })).toBe('24 h');
    expect(formatDelay({ minHours: 72, maxHours: 72 })).toBe('72 h');
    expect(formatDelay({ minHours: 24, maxHours: 48 })).toBe('24 à 48 h');
    expect(formatDelay({ minHours: 120, maxHours: 360 })).toBe('5 à 15 jours');
  });

  it('arrondit la borne haute au jour supérieur et n’annonce jamais plus court', () => {
    expect(formatDelay({ minHours: 48, maxHours: 100 })).toBe('2 à 5 jours');
    expect(formatDelay({ minHours: 168, maxHours: 168 })).toBe('7 jours');
    expect(formatDelay({ minHours: 96, maxHours: 96 })).toBe('4 jours');
    expect(formatDelay({ minHours: 73, maxHours: 73 })).toBe('4 jours');
  });

  it('reprend les trois délais de la cliente par type de zone (D-26)', () => {
    expect(formatDelay(DEFAULT_DELAYS.ABIDJAN)).toBe('24 h');
    expect(formatDelay(DEFAULT_DELAYS.INTERIOR)).toBe('72 h');
    expect(formatDelay(DEFAULT_DELAYS.INTERNATIONAL)).toBe('5 à 15 jours');
  });
});

describe('délai d’une zone', () => {
  it('une zone sans délai reprend celui de son type ; son délai propre l’emporte', () => {
    expect(effectiveDelay('INTERIOR', null, null)).toEqual(DEFAULT_DELAYS.INTERIOR);
    expect(effectiveDelay('INTERIOR', 48, 96)).toEqual({ minHours: 48, maxHours: 96 });
  });

  it('une seule borne = délai fixe ; des bornes inversées sont remises dans l’ordre', () => {
    expect(zoneDelay(36, null)).toEqual({ minHours: 36, maxHours: 36 });
    expect(zoneDelay(null, 48)).toEqual({ minHours: 48, maxHours: 48 });
    expect(zoneDelay(96, 48)).toEqual({ minHours: 48, maxHours: 96 });
    expect(zoneDelay(0, -3)).toBeNull();
    expect(zoneDelay(1.5, null)).toBeNull();
  });

  it('la destination choisie dans le formulaire porte son propre délai', () => {
    expect(delayForDestination('ABIDJAN', { deliveryMinHours: 48, deliveryMaxHours: 48 })).toEqual({ minHours: 48, maxHours: 48 });
    expect(delayForDestination('ABIDJAN', null)).toEqual(DEFAULT_DELAYS.ABIDJAN);
  });
});

describe('résumé par type (FAQ, source unique RM-41)', () => {
  it('fusionne les zones actives d’un type, du plus court au plus long', () => {
    const summary = summarizeDelays([
      { type: 'ABIDJAN', deliveryMinHours: 24, deliveryMaxHours: 24 },
      { type: 'ABIDJAN', deliveryMinHours: 48, deliveryMaxHours: 48 },
      { type: 'ABIDJAN', deliveryMinHours: null, deliveryMaxHours: null },
    ]);
    expect(summary.ABIDJAN).toEqual({ minHours: 24, maxHours: 48 });
    expect(summary.INTERIOR).toEqual(DEFAULT_DELAYS.INTERIOR);
    expect(summary.INTERNATIONAL).toEqual(DEFAULT_DELAYS.INTERNATIONAL);
  });

  it('sans zone, le délai par défaut du type s’applique', () => {
    expect(summarizeDelays([])).toEqual(DEFAULT_DELAYS);
    expect(mergeDelays([])).toBeNull();
  });

  it('la FAQ annonce les délais comme indicatifs, jamais comme une garantie', () => {
    const answer = faqDelayAnswer(DEFAULT_DELAYS);
    expect(answer).toContain('24 h à Abidjan');
    expect(answer).toContain('72 h à l’intérieur de la Côte d’Ivoire');
    expect(answer).toContain('5 à 15 jours à l’international');
    expect(answer).toContain('indicatifs');
    expect(answer).toContain(DELAY_DISCLAIMER);
    expect(answer).not.toMatch(/garanti|assuré|sous \d/i);
  });

  it('la question « frais et délais » de la FAQ reprend ces délais et le texte de la vendeuse', () => {
    const item = faqItems(2000, 'Meëra Kinks', { ...DEFAULT_DELAYS, ABIDJAN: { minHours: 24, maxHours: 48 } }, { leadTimeNote: 'Le délai court à partir de la confirmation.', rules: null }).find((entry) => entry.question.includes('délais'));
    expect(item?.answer).toContain('24 à 48 h à Abidjan');
    expect(item?.answer).toContain('Le délai court à partir de la confirmation.');
  });
});

describe('textes affichés avec un délai', () => {
  it('commencent par « Délai indicatif » et ajoutent les précisions de la vendeuse', () => {
    const lines = deliveryNoticeLines({ minHours: 24, maxHours: 24 }, { leadTimeNote: 'À compter de la confirmation.', rules: 'Livraison du lundi au samedi.' });
    expect(lines[0]).toBe('Délai indicatif : 24 h. L’équipe vous confirme le délai exact sur WhatsApp.');
    expect(lines).toHaveLength(3);
    expect(deliveryNoticeLines({ minHours: 72, maxHours: 72 })).toHaveLength(1);
  });

  it('le message WhatsApp annonce le délai indicatif de la commande', () => {
    const message = buildOrderMessage({
      reference: 'CMD-7K3M9QXP',
      zoneType: 'ABIDJAN',
      placeLabel: 'Cocody (Abidjan)',
      lines: [{ name: 'Soin', quantity: 1, unitPrice: 5000, lineTotal: 5000 }],
      subtotal: 5000,
      deliveryFee: null,
      total: null,
      upfrontAmount: 2000,
      storeName: 'Meëra Kinks',
      customerName: 'Awa Koné',
      phone: '+225 07 00 00 00 00',
      address: 'Riviera',
      note: null,
      depositAmount: 2000,
      deliveryDelay: { minHours: 24, maxHours: 24 },
    });
    expect(message).toContain('Délai indicatif : 24 h.');
  });
});

describe('saisie d’une zone par la vendeuse', () => {
  const base = { name: 'Cocody', type: 'ABIDJAN' } as const;

  it('frais et délais vides = « à confirmer » et délai par défaut', () => {
    const zone = deliveryZoneInputSchema.parse({ ...base, fee: '', deliveryMinHours: '', deliveryMaxHours: null });
    expect(zone.fee).toBeNull();
    expect(zone.deliveryMinHours).toBeNull();
    expect(zone.deliveryMaxHours).toBeNull();
    expect(zone.isActive).toBe(true);
  });

  it('accepte des frais et un délai valides', () => {
    const zone = deliveryZoneInputSchema.parse({ ...base, fee: 1500, deliveryMinHours: 24, deliveryMaxHours: 48 });
    expect(zone).toMatchObject({ fee: 1500, deliveryMinHours: 24, deliveryMaxHours: 48 });
  });

  it('refuse un délai maximal inférieur au minimal, un nombre non entier et un type inconnu', () => {
    expect(deliveryZoneInputSchema.safeParse({ ...base, deliveryMinHours: 48, deliveryMaxHours: 24 }).success).toBe(false);
    expect(deliveryZoneInputSchema.safeParse({ ...base, fee: 12.5 }).success).toBe(false);
    expect(deliveryZoneInputSchema.safeParse({ ...base, deliveryMinHours: 0 }).success).toBe(false);
    expect(deliveryZoneInputSchema.safeParse({ ...base, type: 'MARS' }).success).toBe(false);
    expect(deliveryZoneInputSchema.safeParse({ name: ' ', type: 'ABIDJAN' }).success).toBe(false);
  });

  it('les textes de la vendeuse sont bornés et vides = absents', () => {
    expect(deliveryNotesSchema.parse({ deliveryLeadTimeNote: '  ', deliveryRules: null })).toEqual({ deliveryLeadTimeNote: null, deliveryRules: null });
    expect(deliveryNotesSchema.safeParse({ deliveryLeadTimeNote: 'x'.repeat(401) }).success).toBe(false);
  });
});
