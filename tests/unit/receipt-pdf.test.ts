import { PDFDocument } from 'pdf-lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatFcfa } from '@/lib/money';
import { NO_PAYMENT_MENTION, RECEIPT_NOT_AN_INVOICE, renderReceiptPdf, toPdfText, type ReceiptPdfInput, type ReceiptPdfPayment } from '@/server/integrations/pdf';
import { HttpError } from '@/server/http';
import { buildReceiptData, parseReceiptData, type ReceiptData } from '@/server/services/receipt.service';
import { countPdfPages, extractPdfLines, extractPdfText } from '../helpers/pdf-text';

const { prismaMock } = vi.hoisted(() => ({ prismaMock: { order: { findUnique: vi.fn() } } }));
vi.mock('@/server/db', () => ({ prisma: prismaMock }));
const { getReceiptPdf, renderOrderReceipt } = await import('@/server/services/receipt-pdf.service');

// Les espaces fines des montants (U+202F) sont remplacées par des espaces dans le PDF : on compare après la même mise en forme.
const pdfMoney = (amount: number) => formatFcfa(amount).replace(/\u202f/g, ' ');

const receipt = (overrides: Partial<ReceiptData> = {}): ReceiptData => ({
  ...buildReceiptData({
    issuedAt: new Date('2026-11-17T10:00:00.000Z'),
    shop: { name: 'Awa Beauty', legalName: 'Awa Beauty SARL', address: 'Abidjan, Cocody', contactPhone: '+225 01 02 03 04 05', contactEmail: 'contact@awa.example' },
    depositAmount: 2000,
    customer: { firstName: 'Awa', lastName: 'Koné', phone: '+2250700000000', email: 'awa@example.com' },
    delivery: { zoneType: 'ABIDJAN', country: 'Côte d’Ivoire', city: 'Cocody', address: 'Riviera Palmeraie\nPortail bleu' },
    lines: [
      { name: 'Sérum éclat', unitPrice: 10000, quantity: 2, lineTotal: 20000 },
      { name: 'Savon noir', unitPrice: 4000, quantity: 1, lineTotal: 4000 },
    ],
    subtotal: 24000,
    deliveryFee: null,
    total: null,
    upfrontAmount: 2000,
  }),
  ...overrides,
});

const input = (overrides: Partial<ReceiptPdfInput> = {}): ReceiptPdfInput => ({ number: 'REC-7K3M9QXP', reference: 'CMD-7K3M9QXP', receipt: receipt(), payments: [], ...overrides });
const payment = (overrides: Partial<ReceiptPdfPayment> = {}): ReceiptPdfPayment => ({ kind: 'DEPOSIT', method: 'WAVE', amount: 2000, receivedAt: new Date('2026-11-18T09:00:00.000Z'), voidedAt: null, ...overrides });

describe('reçu PDF — contenu (RM-24, RM-25)', () => {
  it('produit un vrai PDF A4 avec titre et dates figés', async () => {
    const bytes = await renderReceiptPdf(input());
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getSize().width).toBeCloseTo(595.28, 1);
    expect(doc.getTitle()).toBe('Reçu REC-7K3M9QXP');
    expect(doc.getCreationDate()?.toISOString()).toBe('2026-11-17T10:00:00.000Z');
  });

  it('reprend la boutique, le client, la livraison, les articles et les montants', async () => {
    const text = extractPdfText(await renderReceiptPdf(input()));
    for (const expected of [
      'Awa Beauty',
      'Awa Beauty SARL',
      'Abidjan, Cocody',
      'Reçu de commande',
      'REC-7K3M9QXP',
      'CMD-7K3M9QXP',
      '17 novembre 2026',
      'Awa Koné',
      '+225 07 00 00 00 00',
      'awa@example.com',
      'Cocody (Abidjan)',
      'Riviera Palmeraie',
      'Portail bleu',
      'Sérum éclat',
      'Savon noir',
      pdfMoney(10000),
      pdfMoney(20000),
      pdfMoney(24000),
      'Frais de livraison',
      'à confirmer',
    ]) {
      expect(text).toContain(expected);
    }
    expect(text).toContain('acompte');
  });

  it('avant tout paiement : « Paiement non reçu », sans total encaissé (RM-25)', async () => {
    const text = extractPdfText(await renderReceiptPdf(input()));
    expect(text).toContain(NO_PAYMENT_MENTION);
    expect(text).not.toContain('Total encaissé');
  });

  it('porte la mention prudente « ne constitue pas une facture » et la pagination', async () => {
    const text = extractPdfText(await renderReceiptPdf(input()));
    expect(text).toContain(RECEIPT_NOT_AN_INVOICE);
    expect(text).toContain('Page 1/1');
  });

  it('avec des paiements : les liste, calcule le total encaissé et le reste à payer', async () => {
    const full = receipt({ amounts: { currency: 'XOF', subtotal: 24000, deliveryFee: 1500, total: 25500, upfrontAmount: 2000 } });
    const text = extractPdfText(await renderReceiptPdf(input({ receipt: full, payments: [payment()] })));
    expect(text).not.toContain(NO_PAYMENT_MENTION);
    expect(text).toContain('18 novembre 2026 — Acompte (Wave)');
    expect(text).toContain(`Total encaissé`);
    expect(text).toContain(pdfMoney(2000));
    expect(text).toContain('Reste à payer');
    expect(text).toContain(pdfMoney(23500));
  });

  it('reste à payer « à confirmer » tant que le total est inconnu', async () => {
    const lines = extractPdfLines(await renderReceiptPdf(input({ payments: [payment()] })));
    const index = lines.indexOf('Reste à payer');
    expect(index).toBeGreaterThan(-1);
    expect(lines[index + 1]).toBe('à confirmer');
  });

  it('un remboursement est soustrait et affiché en négatif ; un paiement annulé disparaît (RM-21, RM-23)', async () => {
    const full = receipt({ amounts: { currency: 'XOF', subtotal: 24000, deliveryFee: 0, total: 24000, upfrontAmount: 24000 } });
    const payments = [
      payment({ kind: 'FULL', method: 'CASH', amount: 24000, receivedAt: new Date('2026-11-18T09:00:00.000Z') }),
      payment({ kind: 'REFUND', method: 'WAVE', amount: 4000, receivedAt: new Date('2026-11-19T09:00:00.000Z') }),
      payment({ kind: 'DEPOSIT', method: 'WAVE', amount: 9999, voidedAt: new Date() }),
    ];
    const text = extractPdfText(await renderReceiptPdf(input({ receipt: full, payments })));
    expect(text).toContain('Paiement intégral (Espèces)');
    expect(text).toContain('Remboursement (Wave)');
    expect(text).toContain(`- ${pdfMoney(4000)}`);
    expect(text).not.toContain('?'); // aucun caractère remplacé : tout ce que le reçu écrit est lisible
    expect(text).not.toContain(pdfMoney(9999));
    expect(text).toContain(pdfMoney(20000)); // 24 000 − 4 000
  });

  it('tous les paiements annulés : retour à « Paiement non reçu »', async () => {
    const text = extractPdfText(await renderReceiptPdf(input({ payments: [payment({ voidedAt: new Date() })] })));
    expect(text).toContain(NO_PAYMENT_MENTION);
  });

  it('omet les coordonnées absentes au lieu d’écrire « null »', async () => {
    const bare = receipt({ shop: { name: 'Awa Beauty', legalName: null, address: null, contactPhone: null, contactEmail: null }, customer: { firstName: 'Awa', lastName: 'Koné', phone: '+2250700000000', email: null } });
    const text = extractPdfText(await renderReceiptPdf(input({ receipt: bare })));
    expect(text).not.toMatch(/null|undefined/);
  });
});

describe('reçu PDF — robustesse', () => {
  it('n’échoue jamais sur des caractères que la police ne sait pas écrire (emoji, alphabets, lettres rares)', async () => {
    const odd = receipt({
      customer: { firstName: 'Ọlá', lastName: 'Adéwálé 😀', phone: '+2250700000000', email: null },
      lines: [{ name: 'Crème 日本語 «spéciale» — 50 ml', unitPrice: 1000, quantity: 1, lineTotal: 1000 }],
    });
    const text = extractPdfText(await renderReceiptPdf(input({ receipt: odd })));
    expect(text).toContain('Olá Adéwálé ?');
    expect(text).toContain('Crème ??? «spéciale» — 50 ml');
  });

  it('toPdfText remplace les espaces fines, supprime les retours à la ligne et garde le latin accentué', () => {
    const supported = new Set([...'abcdefghijklmnopqrstuvwxyzéèàçô 0123456789’—×'].map((char) => char.codePointAt(0) as number));
    expect(toPdfText('10\u202f000\nfcfa', supported)).toBe('10 000 fcfa');
    expect(toPdfText('é’—×', supported)).toBe('é’—×');
    expect(toPdfText('ẹ', supported)).toBe('e');
    expect(toPdfText('😀', supported)).toBe('?');
  });

  it('passe à la ligne une longue désignation et coupe un mot sans espace au lieu de déborder', async () => {
    const long = receipt({
      delivery: { zoneType: 'INTERIOR', country: 'Côte d’Ivoire', city: 'Bouaké', address: 'x'.repeat(400) },
      lines: [{ name: 'Produit au nom vraiment très long '.repeat(6), unitPrice: 5000, quantity: 3, lineTotal: 15000 }],
    });
    const bytes = await renderReceiptPdf(input({ receipt: long }));
    const lines = extractPdfLines(bytes);
    expect(lines.filter((line) => line.startsWith('Produit au nom')).length).toBeGreaterThan(1);
    expect(lines.filter((line) => /^x+$/.test(line)).length).toBeGreaterThan(1);
    expect(await countPdfPages(bytes)).toBe(1);
  });

  it('crée des pages supplémentaires pour une longue commande, avec rappel du numéro et pagination', async () => {
    const many = receipt({ lines: Array.from({ length: 70 }, (_, index) => ({ name: `Produit ${index + 1}`, unitPrice: 1000, quantity: 1, lineTotal: 1000 })) });
    const bytes = await renderReceiptPdf(input({ receipt: many }));
    const pages = await countPdfPages(bytes);
    expect(pages).toBeGreaterThanOrEqual(2);
    const text = extractPdfText(bytes);
    expect(text).toContain('Reçu REC-7K3M9QXP — commande CMD-7K3M9QXP (suite)');
    expect(text).toContain(`Page 1/${pages}`);
    expect(text).toContain(`Page ${pages}/${pages}`);
    expect(text).toContain('Produit 70');
    expect(text).toContain(NO_PAYMENT_MENTION);
  });
});

describe('données figées du reçu — validation', () => {
  it('relit ce que buildReceiptData a écrit', () => {
    const original = receipt();
    expect(parseReceiptData(JSON.parse(JSON.stringify(original)))).toEqual(original);
  });
  it('refuse des données corrompues ou d’une autre version', () => {
    expect(() => parseReceiptData(null)).toThrow();
    expect(() => parseReceiptData({ ...receipt(), version: 2 })).toThrow();
    expect(() => parseReceiptData({ ...receipt(), lines: 'oups' })).toThrow();
    expect(() => parseReceiptData({ ...receipt(), amounts: { ...receipt().amounts, subtotal: 12.5 } })).toThrow();
    expect(() => parseReceiptData({ ...receipt(), delivery: { ...receipt().delivery, zoneType: 'MARS' } })).toThrow();
  });
});

describe('service du reçu PDF', () => {
  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 'order_1',
    reference: 'CMD-7K3M9QXP',
    customerNote: null,
    deliveryStatus: 'PENDING',
    paymentStatus: 'DEPOSIT_DUE',
    receipt: { number: 'REC-7K3M9QXP', data: JSON.parse(JSON.stringify(receipt())) },
    payments: [],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.order.findUnique.mockResolvedValue(row());
  });

  it('retrouve la commande par référence publique ou par identifiant', async () => {
    await getReceiptPdf('CMD-7K3M9QXP');
    expect(prismaMock.order.findUnique).toHaveBeenLastCalledWith(expect.objectContaining({ where: { reference: 'CMD-7K3M9QXP' } }));
    await getReceiptPdf('cmabc123');
    expect(prismaMock.order.findUnique).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: 'cmabc123' } }));
  });

  it('renvoie un nom de fichier sûr et un PDF lisible, paiements compris', async () => {
    prismaMock.order.findUnique.mockResolvedValue(row({ payments: [payment()] }));
    const result = await getReceiptPdf('CMD-7K3M9QXP');
    expect(result.filename).toBe('REC-7K3M9QXP.pdf');
    expect(extractPdfText(result.bytes)).toContain('Acompte (Wave)');
  });

  it('404 pour une commande introuvable ou sans reçu', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    await expect(getReceiptPdf('CMD-7K3M9QXP')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    await expect(renderOrderReceipt(row({ receipt: null }) as never)).rejects.toMatchObject({ status: 404 });
  });

  it('500 clair (jamais un faux document) quand les données figées sont corrompues', async () => {
    prismaMock.order.findUnique.mockResolvedValue(row({ receipt: { number: 'REC-7K3M9QXP', data: { version: 1 } } }));
    const error = await getReceiptPdf('CMD-7K3M9QXP').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
  });
});
