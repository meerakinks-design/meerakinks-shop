import { unzipSync, strFromU8 } from 'fflate'; // dépendance de write-excel-file : sert ici à relire le .xlsx produit
import { describe, expect, it } from 'vitest';
import { ZONE_TYPES } from '@/lib/constants/order';
import { DELIVERY_STATUSES, PAYMENT_STATUSES } from '@/lib/constants/order-status';
import { ORDERS_EXPORT_ZONE_LABELS } from '@/lib/constants/orders-export';
import {
  abidjanDateStamp,
  buildExportRow,
  buildExportTable,
  CSV_BOM,
  exportFilename,
  formatAbidjanDateTime,
  formatOrderLines,
  neutralizeFormula,
  ORDERS_EXPORT_COLUMNS,
  toCsv,
  toExcelSerial,
  type ExportOrder,
} from '@/lib/orders-export';
import { toXlsx } from '@/lib/orders-export-xlsx';

const order = (overrides: Partial<ExportOrder> = {}): ExportOrder => ({
  reference: 'CMD-7K3M9QXP',
  createdAt: new Date('2026-11-20T14:30:45Z'),
  deliveryStatus: 'PENDING',
  paymentStatus: 'DEPOSIT_PAID',
  zoneType: 'ABIDJAN',
  shippingCountry: 'Côte d’Ivoire',
  shippingCity: 'Cocody',
  shippingAddress: 'Riviera 3, villa 12',
  customerNote: 'Sonner deux fois',
  subtotal: 25000,
  deliveryFee: 1500,
  total: 26500,
  upfrontAmount: 5000,
  customer: { firstName: 'Awa', lastName: 'Koné', phone: '+2250700000000', email: 'awa@example.com' },
  items: [
    { productNameSnapshot: 'Huile', quantity: 2 },
    { productNameSnapshot: 'Beurre', quantity: 1 },
  ],
  payments: [{ kind: 'DEPOSIT', amount: 5000, voidedAt: null }],
  ...overrides,
});

const column = (name: string) => ORDERS_EXPORT_COLUMNS.findIndex((item) => item.header === name);

describe('colonnes (cahier P-55)', () => {
  it('suivent l’ordre du cahier', () => {
    expect(ORDERS_EXPORT_COLUMNS.map((item) => item.header)).toEqual([
      'Référence',
      'Date et heure (Abidjan)',
      'Nom',
      'Téléphone',
      'Email',
      'Zone',
      'Destination',
      'Adresse',
      'Lignes',
      'Sous-total (FCFA)',
      'Frais de livraison (FCFA)',
      'Total (FCFA)',
      'À régler pour confirmer (FCFA)',
      'Encaissé (FCFA)',
      'Reste à payer (FCFA)',
      'Statut de livraison',
      'Statut de paiement',
      'Note du client',
    ]);
  });

  it('chaque ligne a autant de cellules que d’en-têtes', () => {
    expect(buildExportRow(order())).toHaveLength(ORDERS_EXPORT_COLUMNS.length);
    expect(buildExportRow(order({ customerNote: null, customer: { firstName: 'A', lastName: 'B', phone: '+1', email: null } }))).toHaveLength(ORDERS_EXPORT_COLUMNS.length);
  });

  it('couvre tous les statuts et toutes les zones sans libellé manquant', () => {
    for (const deliveryStatus of DELIVERY_STATUSES) for (const paymentStatus of PAYMENT_STATUSES) {
      const row = buildExportRow(order({ deliveryStatus, paymentStatus }));
      expect(row[column('Statut de livraison')]).toEqual(expect.any(String));
      expect(row[column('Statut de paiement')]).toEqual(expect.any(String));
    }
    for (const zoneType of ZONE_TYPES) expect(buildExportRow(order({ zoneType }))[column('Zone')]).toBe(ORDERS_EXPORT_ZONE_LABELS[zoneType]);
  });
});

describe('neutralizeFormula (protection des tableurs, P-55)', () => {
  it.each(['=1+1', '+2250700000000', '-5', '@SUM(A1)', '=HYPERLINK("http://x")', '\t=1', '\r=1'])('préfixe d’une apostrophe : %j', (value) => {
    expect(neutralizeFormula(value)).toBe(`'${value}`);
  });

  it.each(['Awa', 'CMD-7K3M9QXP', '', ' =1+1', 'a=b', '1+1', 'Riviera 3, villa 12'])('laisse intact : %j', (value) => {
    expect(neutralizeFormula(value)).toBe(value);
  });

  it('s’applique aux cellules de texte d’une commande, jamais aux montants', () => {
    const row = buildExportRow(
      order({
        customer: { firstName: '=cmd|calc', lastName: '+Koné', phone: '+2250700000000', email: '@pirate.example' },
        shippingAddress: '-2+3',
        customerNote: '=HYPERLINK("http://x")',
        items: [{ productNameSnapshot: '=1+1', quantity: 1 }],
      }),
    );
    expect(row[column('Nom')]).toBe("'=cmd|calc +Koné");
    expect(row[column('Téléphone')]).toBe("'+2250700000000");
    expect(row[column('Email')]).toBe("'@pirate.example");
    expect(row[column('Adresse')]).toBe("'-2+3");
    expect(row[column('Lignes')]).toBe("'=1+1 × 1");
    expect(row[column('Note du client')]).toBe("'=HYPERLINK(\"http://x\")");
    // un montant reste un nombre, même négatif
    expect(typeof row[column('Sous-total (FCFA)')]).toBe('number');
  });
});

describe('contenu d’une ligne', () => {
  it('montants : encaissé et reste à payer calculés depuis les paiements (annulés ignorés, remboursements soustraits)', () => {
    const row = buildExportRow(
      order({
        total: 26500,
        payments: [
          { kind: 'DEPOSIT', amount: 5000, voidedAt: null },
          { kind: 'BALANCE', amount: 9999, voidedAt: new Date('2026-11-21T00:00:00Z') },
          { kind: 'BALANCE', amount: 10000, voidedAt: null },
          { kind: 'REFUND', amount: 2000, voidedAt: null },
        ],
      }),
    );
    expect(row[column('Encaissé (FCFA)')]).toBe(13000);
    expect(row[column('Reste à payer (FCFA)')]).toBe(13500);
    expect(row[column('Sous-total (FCFA)')]).toBe(25000);
    expect(row[column('Frais de livraison (FCFA)')]).toBe(1500);
    expect(row[column('Total (FCFA)')]).toBe(26500);
    expect(row[column('À régler pour confirmer (FCFA)')]).toBe(5000);
  });

  it('frais à confirmer : total et reste à payer restent vides, jamais inventés', () => {
    const row = buildExportRow(order({ deliveryFee: null, total: null, upfrontAmount: null, payments: [] }));
    expect(row[column('Frais de livraison (FCFA)')]).toBeNull();
    expect(row[column('Total (FCFA)')]).toBeNull();
    expect(row[column('À régler pour confirmer (FCFA)')]).toBeNull();
    expect(row[column('Encaissé (FCFA)')]).toBe(0);
    expect(row[column('Reste à payer (FCFA)')]).toBeNull();
  });

  it('lignes : « produit × quantité », une par ligne de la cellule', () => {
    expect(formatOrderLines(order().items)).toBe('Huile × 2\nBeurre × 1');
    expect(buildExportRow(order())[column('Lignes')]).toBe('Huile × 2\nBeurre × 1');
  });

  it('destination selon la zone, adresse, note, email vide', () => {
    expect(buildExportRow(order())[column('Destination')]).toBe('Cocody (Abidjan)');
    expect(buildExportRow(order({ zoneType: 'INTERIOR', shippingCity: 'Bouaké' }))[column('Destination')]).toBe('Bouaké, Côte d’Ivoire');
    expect(buildExportRow(order({ zoneType: 'INTERNATIONAL', shippingCity: 'Lyon', shippingCountry: 'France' }))[column('Destination')]).toBe('Lyon, France');
    const row = buildExportRow(order({ customerNote: null, customer: { firstName: 'Awa', lastName: 'Koné', phone: '+2250700000000', email: null } }));
    expect(row[column('Email')]).toBe('');
    expect(row[column('Note du client')]).toBe('');
  });

  it('client effacé : le fichier ne montre que « Client anonymisé »', () => {
    const row = buildExportRow(order({ customer: { firstName: 'Client', lastName: 'anonymisé', phone: 'anon-cus_1', email: null }, shippingAddress: 'Adresse supprimée', customerNote: null }));
    expect(row[column('Nom')]).toBe('Client anonymisé');
    expect(row[column('Adresse')]).toBe('Adresse supprimée');
  });

  it('la note interne n’est pas dans le fichier : l’entrée de l’export n’en connaît même pas le champ', () => {
    const keys = Object.keys(order());
    expect(keys).not.toContain('internalNote');
  });
});

describe('dates à l’heure d’Abidjan', () => {
  it('format jj/mm/aaaa hh:mm', () => {
    expect(formatAbidjanDateTime(new Date('2026-11-20T14:30:45Z'))).toBe('20/11/2026 14:30');
    expect(formatAbidjanDateTime(new Date('2026-01-05T00:05:00Z'))).toBe('05/01/2026 00:05');
    expect(formatAbidjanDateTime(new Date('2026-12-31T23:59:59Z'))).toBe('31/12/2026 23:59');
  });

  it('date Excel : 1970-01-01 = 25 569, midi = +0,5, arrondie à la minute', () => {
    expect(toExcelSerial(new Date('1970-01-01T00:00:00Z'))).toBe(25569);
    expect(toExcelSerial(new Date('1970-01-01T12:00:00Z'))).toBe(25569.5);
    expect(toExcelSerial(new Date('2026-11-20T14:30:45Z'))).toBe(toExcelSerial(new Date('2026-11-20T14:30:00Z')));
  });

  it('nom de fichier : commandes-AAAA-MM-JJ.ext', () => {
    expect(abidjanDateStamp(new Date('2026-11-20T23:30:00Z'))).toBe('2026-11-20');
    expect(exportFilename('csv', new Date('2026-11-20T23:30:00Z'))).toBe('commandes-2026-11-20.csv');
    expect(exportFilename('xlsx', new Date('2026-01-02T00:00:00Z'))).toBe('commandes-2026-01-02.xlsx');
  });
});

describe('CSV (UTF-8 avec BOM, séparateur « ; »)', () => {
  const csv = toCsv(buildExportTable([order()]));

  it('commence par le BOM UTF-8, sépare par « ; », termine les lignes par CRLF', () => {
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    const [header] = csv.slice(1).split('\r\n');
    expect(header?.split(';')).toEqual(ORDERS_EXPORT_COLUMNS.map((item) => item.header));
  });

  it('octets : EF BB BF en tête une fois encodé', () => {
    expect([...Buffer.from(csv, 'utf8').subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it('nombres bruts, dates lisibles, cellule à lignes multiples entre guillemets', () => {
    expect(csv).toContain('CMD-7K3M9QXP;20/11/2026 14:30;Awa Koné;');
    expect(csv).toContain('"Huile × 2\nBeurre × 1"');
    expect(csv).toContain(';25000;1500;26500;5000;5000;21500;');
  });

  it('guillemets doublés, « ; » protégés, vides sans rien', () => {
    const tricky = toCsv(buildExportTable([order({ customerNote: 'Il a dit "oui"; puis non', shippingAddress: 'A;B', deliveryFee: null, total: null })]));
    expect(tricky).toContain('"Il a dit ""oui""; puis non"');
    expect(tricky).toContain('"A;B"');
    expect(tricky).toMatch(/;25000;;;5000;5000;;/);
  });

  it('formules neutralisées dans le CSV, y compris quand la cellule est entre guillemets', () => {
    const hostile = toCsv(buildExportTable([order({ customer: { firstName: '=1+1', lastName: 'X;Y', phone: '+2250700000000', email: null }, customerNote: '@SUM(A1)\nligne 2' })]));
    expect(hostile).toContain("'=1+1 X;Y");
    expect(hostile).not.toMatch(/(^|;)=1\+1/m);
    expect(hostile).toContain("\"'@SUM(A1)\nligne 2\"");
    expect(hostile).toContain(";'+2250700000000;");
  });

  it('aucune commande : seulement l’en-tête', () => {
    expect(toCsv(buildExportTable([])).split('\r\n')).toHaveLength(2);
  });
});

describe('Excel (.xlsx)', () => {
  async function read(orders: ExportOrder[]) {
    const files = unzipSync(new Uint8Array(await toXlsx(buildExportTable(orders))));
    const text = (name: string) => strFromU8(files[name] as Uint8Array);
    return { names: Object.keys(files), sheet: text('xl/worksheets/sheet1.xml'), strings: text('xl/sharedStrings.xml'), styles: text('xl/styles.xml'), workbook: text('xl/workbook.xml') };
  }

  it('produit un vrai fichier .xlsx (archive avec feuille « Commandes »)', async () => {
    const buffer = await toXlsx(buildExportTable([order()]));
    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
    const { names, workbook } = await read([order()]);
    expect(names).toEqual(expect.arrayContaining(['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml']));
    expect(workbook).toContain('name="Commandes"');
  });

  it('en-têtes, textes et lignes multiples dans le fichier ; en-tête figé ; montants numériques ; date en vraie date', async () => {
    const { sheet, strings, styles } = await read([order()]);
    for (const header of ORDERS_EXPORT_COLUMNS) expect(strings).toContain(header.header);
    expect(strings).toContain('Awa Koné');
    expect(strings).toMatch(/Huile × 2\s*Beurre × 1/);
    expect(sheet).toMatch(/<pane[^>]*ySplit="1"/);
    expect(sheet).toContain('<v>25000</v>');
    expect(sheet).toContain(`<v>${toExcelSerial(new Date('2026-11-20T14:30:00Z'))}</v>`);
    expect(styles).toContain('dd/mm/yyyy hh:mm');
  });

  it('aucune formule dans le fichier : une cellule hostile reste du texte, avec l’apostrophe de protection', async () => {
    const { sheet, strings } = await read([order({ customer: { firstName: '=HYPERLINK("http://x")', lastName: 'Koné', phone: '+2250700000000', email: null }, customerNote: '@SUM(A1)' })]);
    expect(sheet).not.toContain('<f>');
    expect(sheet).not.toMatch(/<f[ >]/);
    expect(strings).toContain('\'=HYPERLINK("http://x") Koné');
    expect(strings).toContain("'@SUM(A1)");
    expect(strings).toContain("'+2250700000000");
  });

  it('sans commande : le fichier existe, avec ses en-têtes', async () => {
    const { strings } = await read([]);
    expect(strings).toContain('Référence');
  });
});
