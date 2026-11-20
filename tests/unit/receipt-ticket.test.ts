import { describe, expect, it } from 'vitest';
import { ORDER_NOTICE_CONFIRMATION_STEPS } from '@/content/livraison';
import { RECEIPT_TEXT } from '@/content/receipt';
import { clearFreshReceipt, isFreshReceipt, markFreshReceipt } from '@/lib/shop/receipt-flag';
import type { OrderRecap } from '@/lib/shop/order-types';
import { CODE39_TABLE, buildTicketModel, clampLines, code39Runs, formatIssuedAt, isCode39Text, plain, receiptFilename, ticketAltText, wrapText } from '@/lib/shop/receipt-ticket';

const order = (overrides: Partial<OrderRecap> = {}): OrderRecap => ({
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
  ...overrides,
});
const ISSUED = new Date('2026-11-18T06:26:00Z');
const everyText = (model: ReturnType<typeof buildTicketModel>) => JSON.stringify(model).toLowerCase();

describe('code-barres Code 39', () => {
  it('chaque caractère a 9 éléments dont exactement 3 larges, tous différents', () => {
    const patterns = Object.values(CODE39_TABLE);
    for (const pattern of patterns) {
      expect(pattern).toMatch(/^[nw]{9}$/);
      expect(pattern.split('w')).toHaveLength(4); // 3 larges
    }
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it('encode la référence entre deux « * » (départ et arrêt), avec un espace étroit entre les caractères', () => {
    const runs = code39Runs('CMD-7K3M9QXP');
    expect(runs).not.toBeNull();
    // 14 caractères (départ + 12 + arrêt) × 9 éléments + 13 espaces entre caractères
    expect(runs).toHaveLength(14 * 9 + 13);
    const star = [...(CODE39_TABLE['*'] as string)].map((element) => element === 'w');
    expect(runs?.slice(0, 9).map((run) => run.wide)).toEqual(star);
    expect(runs?.slice(-9).map((run) => run.wide)).toEqual(star);
    expect(runs?.[0]?.bar).toBe(true);
    expect(runs?.[9]).toEqual({ bar: false, wide: false });
  });

  it('refuse ce qui ne s’encode pas (minuscule, « * », vide)', () => {
    expect(isCode39Text('CMD-7K3M9QXP')).toBe(true);
    expect(code39Runs('cmd-1')).toBeNull();
    expect(code39Runs('A*B')).toBeNull();
    expect(code39Runs('')).toBeNull();
  });
});

describe('modèle du reçu', () => {
  it('frais et total inconnus : « à confirmer », jamais un chiffre inventé (RM-03)', () => {
    const model = buildTicketModel(order(), { shopName: 'Awa Beauty', issuedAt: ISSUED });
    const byLabel = Object.fromEntries(model.totals.map((row) => [row.label, row.value]));
    expect(byLabel[RECEIPT_TEXT.deliveryFeeLabel]).toBe('à confirmer');
    expect(byLabel[RECEIPT_TEXT.totalLabel]).toBe('à confirmer');
    expect(byLabel[RECEIPT_TEXT.subtotalLabel]).toBe('24 000 FCFA');
  });

  it('frais connus : total chiffré ; hors Abidjan, libellé « À régler avant expédition »', () => {
    const model = buildTicketModel(order({ zoneType: 'INTERIOR', placeLabel: 'Bouaké, Côte d’Ivoire', deliveryFee: 3000, total: 27000, upfrontAmount: 27000 }), { issuedAt: ISSUED });
    const byLabel = Object.fromEntries(model.totals.map((row) => [row.label, row.value]));
    expect(byLabel[RECEIPT_TEXT.totalLabel]).toBe('27 000 FCFA');
    expect(byLabel['À régler avant expédition']).toBe('27 000 FCFA');
    expect(byLabel['Acompte pour confirmer']).toBeUndefined();
  });

  it('à Abidjan : « Acompte pour confirmer » (même libellé que la page de confirmation)', () => {
    const model = buildTicketModel(order(), { issuedAt: ISSUED });
    expect(model.totals.at(-1)).toMatchObject({ label: 'Acompte pour confirmer', value: '2 000 FCFA' });
  });

  it('ne présente jamais un paiement comme reçu (RM-10, RM-25) et porte la mention de P-35', () => {
    const model = buildTicketModel(order(), { issuedAt: ISSUED });
    const text = everyText(model);
    expect(model.stamp).toBe('PAIEMENT NON REÇU');
    for (const forbidden of ['payée', 'payé ', 'paiement reçu', 'paiement confirmé', 'approved', 'paid']) expect(text).not.toContain(forbidden);
    expect(model.footer).toBe('Reçu de commande — ne constitue pas une facture.');
    expect(ticketAltText(order()).toLowerCase()).not.toContain('paiement reçu');
  });

  it('reprend les étapes validées de content/livraison.ts', () => {
    expect(buildTicketModel(order(), { issuedAt: ISSUED }).steps).toEqual([...ORDER_NOTICE_CONFIRMATION_STEPS]);
  });

  it('n’imprime que la quantité et l’unité des lignes multiples, sans espace insécable (polices monospace)', () => {
    const model = buildTicketModel(order(), { issuedAt: ISSUED });
    expect(model.lines[0]).toMatchObject({ label: '2 × Sérum éclat', total: '20 000 FCFA', unitNote: '10 000 FCFA l’unité' });
    expect(model.lines[1]?.unitNote).toBeNull();
    expect(JSON.stringify(model)).not.toMatch(/[\u202f\u00a0]/);
    expect(plain('12\u202f500\u00a0FCFA')).toBe('12 500 FCFA');
  });

  it('ne contient aucune donnée personnelle : seulement ce que la page de confirmation affiche', () => {
    expect(Object.keys(buildTicketModel(order(), { issuedAt: ISSUED })).sort()).toEqual(
      ['barcodeText', 'footer', 'issuedLabel', 'lines', 'placeLabel', 'reference', 'shopName', 'stamp', 'stampNote', 'steps', 'stepsIntro', 'thanks', 'title', 'totals'].sort(),
    );
  });

  it('nom de boutique absent : repli sur un libellé neutre', () => {
    expect(buildTicketModel(order(), { issuedAt: ISSUED }).shopName).toBe(RECEIPT_TEXT.fallbackShopName);
    expect(buildTicketModel(order(), { shopName: '  Awa Beauty ', issuedAt: ISSUED }).shopName).toBe('Awa Beauty');
  });

  it('date à l’heure d’Abidjan et nom de fichier sûr', () => {
    expect(formatIssuedAt(ISSUED)).toMatch(/^18 nov\.? 2026 · 06:26$/);
    expect(receiptFilename('CMD-7K3M9QXP')).toBe('recu-CMD-7K3M9QXP.png');
  });
});

describe('découpage du texte', () => {
  const measure = (value: string) => value.length * 10;

  it('coupe entre les mots, sans dépasser la largeur', () => {
    const lines = wrapText('un deux trois quatre cinq', 80, measure);
    expect(lines.every((line) => measure(line) <= 80)).toBe(true);
    expect(lines.join(' ')).toBe('un deux trois quatre cinq');
  });

  it('coupe au caractère un mot trop long', () => {
    const lines = wrapText('anticonstitutionnellement', 100, measure);
    expect(lines.every((line) => measure(line) <= 100)).toBe(true);
    expect(lines.join('')).toBe('anticonstitutionnellement');
  });

  it('limite le nombre de lignes et termine par « … »', () => {
    const lines = clampLines(['a', 'b', 'c', 'd'], 2, measure, 100);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('b…');
    expect(clampLines(['a', 'b'], 3, measure, 100)).toEqual(['a', 'b']);
  });
});

describe('drapeau « reçu à télécharger tout de suite »', () => {
  const fakeStorage = () => {
    const data = new Map<string, string>();
    return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value), removeItem: (key: string) => void data.delete(key) };
  };

  it('posé à la commande, consommé une seule fois', () => {
    const storage = fakeStorage();
    expect(isFreshReceipt('CMD-AAAAAAAA', storage)).toBe(false);
    markFreshReceipt('CMD-AAAAAAAA', storage);
    expect(isFreshReceipt('CMD-AAAAAAAA', storage)).toBe(true);
    expect(isFreshReceipt('CMD-BBBBBBBB', storage)).toBe(false);
    clearFreshReceipt('CMD-AAAAAAAA', storage);
    expect(isFreshReceipt('CMD-AAAAAAAA', storage)).toBe(false);
  });

  it('stockage indisponible : jamais d’erreur, simplement pas de téléchargement automatique', () => {
    const broken = {
      getItem: () => { throw new Error('refusé'); },
      setItem: () => { throw new Error('refusé'); },
      removeItem: () => { throw new Error('refusé'); },
    };
    expect(() => markFreshReceipt('CMD-AAAAAAAA', broken)).not.toThrow();
    expect(isFreshReceipt('CMD-AAAAAAAA', broken)).toBe(false);
    expect(() => clearFreshReceipt('CMD-AAAAAAAA', broken)).not.toThrow();
    expect(isFreshReceipt('CMD-AAAAAAAA', null)).toBe(false);
  });
});
