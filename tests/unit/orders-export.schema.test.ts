import { ZodError } from 'zod';
import { describe, expect, it } from 'vitest';
import { parseOrdersExportQuery } from '@/lib/validation/orders-export.schema';

const parse = (query: string) => parseOrdersExportQuery(new URLSearchParams(query));
const issues = (query: string): ZodError['issues'] => {
  try {
    parse(query);
  } catch (error) {
    if (error instanceof ZodError) return error.issues;
    throw error;
  }
  throw new Error('aucune erreur de validation');
};

describe('filtres de l’export des commandes', () => {
  it('format seul : aucun filtre', () => {
    expect(parse('format=csv')).toEqual({ format: 'csv', from: undefined, to: undefined, deliveryStatuses: [], paymentStatuses: [], zones: [] });
    expect(parse('format=xlsx').format).toBe('xlsx');
  });

  it('période, statuts et zones (champs répétés)', () => {
    expect(parse('format=xlsx&from=2026-11-01&to=2026-11-30&deliveryStatus=PENDING&deliveryStatus=CONFIRMED&paymentStatus=PAID&zone=ABIDJAN&zone=INTERIOR')).toEqual({
      format: 'xlsx',
      from: '2026-11-01',
      to: '2026-11-30',
      deliveryStatuses: ['PENDING', 'CONFIRMED'],
      paymentStatuses: ['PAID'],
      zones: ['ABIDJAN', 'INTERIOR'],
    });
  });

  it('un champ vide d’un formulaire n’est pas un filtre ; les doublons et les paramètres inconnus sont ignorés', () => {
    expect(parse('format=csv&from=&to=&deliveryStatus=&zone=ABIDJAN&zone=ABIDJAN&page=3&q=x')).toEqual({
      format: 'csv',
      from: undefined,
      to: undefined,
      deliveryStatuses: [],
      paymentStatuses: [],
      zones: ['ABIDJAN'],
    });
  });

  it('format absent ou inconnu : refusé', () => {
    expect(issues('from=2026-11-01')[0]?.path).toEqual(['format']);
    expect(issues('format=pdf')[0]?.path).toEqual(['format']);
    expect(issues('format=XLSX')[0]?.path).toEqual(['format']);
  });

  it.each(['2026-02-30', '2026-13-01', '01/11/2026', '2026-1-1', 'hier', '2026-11-01T00:00:00Z'])('date invalide refusée : %s', (value) => {
    expect(issues(`format=csv&from=${encodeURIComponent(value)}`)[0]?.path).toEqual(['from']);
  });

  it('début après la fin : refusé, sur le champ « to »', () => {
    expect(issues('format=csv&from=2026-12-01&to=2026-11-01')[0]).toMatchObject({ path: ['to'], message: 'La date de fin est avant la date de début.' });
    expect(parse('format=csv&from=2026-11-01&to=2026-11-01').to).toBe('2026-11-01');
  });

  it('valeur de statut ou de zone inconnue : refusée (jamais transmise à la base)', () => {
    expect(issues('format=csv&deliveryStatus=DROP')[0]?.path[0]).toBe('deliveryStatuses');
    expect(issues('format=csv&paymentStatus=nope')[0]?.path[0]).toBe('paymentStatuses');
    expect(issues('format=csv&zone=MARS')[0]?.path[0]).toBe('zones');
  });
});
