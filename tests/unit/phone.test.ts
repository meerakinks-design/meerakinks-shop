import { describe, expect, it } from 'vitest';
import { DIAL_CODES, formatPhoneDisplay, normalizePhone } from '@/lib/shop/phone';

const e164 = (dial: string, number: string) => {
  const result = normalizePhone(dial, number);
  return result.ok ? result.e164 : `ERREUR: ${result.message}`;
};

describe('normalizePhone — Côte d’Ivoire (10 chiffres, le 0 initial fait partie du numéro)', () => {
  it('garde le 0 initial', () => {
    expect(e164('225', '07 00 00 00 00')).toBe('+2250700000000');
    expect(e164('225', '0700000000')).toBe('+2250700000000');
    expect(e164('225', '01.02.03.04.05')).toBe('+2250102030405');
  });
  it('refuse l’ancien format à 8 chiffres et les numéros trop longs', () => {
    const old = normalizePhone('225', '07 00 00 00');
    expect(old.ok).toBe(false);
    if (!old.ok) expect(old.message).toContain('10 chiffres');
    expect(normalizePhone('225', '070000000000').ok).toBe(false);
  });
  it('accepte un numéro saisi en entier avec + ou 00, quel que soit l’indicatif du sélecteur', () => {
    expect(e164('33', '+225 07 00 00 00 00')).toBe('+2250700000000');
    expect(e164('33', '00225 07 00 00 00 00')).toBe('+2250700000000');
    expect(normalizePhone('33', '+225 07 00 00 00').ok).toBe(false);
  });
});

describe('normalizePhone — autres pays', () => {
  it('retire un seul 0 de tête (préfixe national)', () => {
    expect(e164('33', '06 12 34 56 78')).toBe('+33612345678');
    expect(e164('44', '07911 123456')).toBe('+447911123456');
  });
  it('accepte un indicatif saisi à la main (« Autre pays »)', () => {
    expect(e164('+971', '50 123 4567')).toBe('+971501234567');
  });
  it('refuse un indicatif invalide', () => {
    expect(normalizePhone('', '0612345678').ok).toBe(false);
    expect(normalizePhone('abc', '0612345678').ok).toBe(false);
    expect(normalizePhone('0225', '0700000000').ok).toBe(false);
    expect(normalizePhone('12345', '0612345678').ok).toBe(false);
  });
});

describe('normalizePhone — cas limites', () => {
  it('refuse le vide, les lettres seules et les longueurs hors norme', () => {
    expect(normalizePhone('225', '').ok).toBe(false);
    expect(normalizePhone('225', '   ').ok).toBe(false);
    expect(normalizePhone('225', 'abc').ok).toBe(false);
    expect(normalizePhone('33', '12').ok).toBe(false);
    expect(normalizePhone('33', '1'.repeat(14)).ok).toBe(false);
  });
  it('la liste des indicatifs est propre : chiffres seulement, sans doublon', () => {
    const codes = DIAL_CODES.map((dial) => dial.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^[1-9]\d{0,3}$/);
    expect(DIAL_CODES[0]?.code).toBe('225');
  });
});

describe('formatPhoneDisplay', () => {
  it('groupe les numéros ivoiriens par deux chiffres', () => {
    expect(formatPhoneDisplay('+2250700000000')).toBe('+225 07 00 00 00 00');
  });
  it('laisse les autres pays tels quels', () => {
    expect(formatPhoneDisplay('+33612345678')).toBe('+33612345678');
  });
});
