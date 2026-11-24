import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ORDERS_EXPORT_MAX_ROWS } from '@/lib/constants/orders-export';
import { HttpError } from '@/server/http';

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  recordAudit: vi.fn(async (_entry: unknown) => undefined),
}));
vi.mock('@/server/db', () => ({ prisma: { order: { findMany: m.findMany } } }));
vi.mock('@/server/services/audit.service', () => ({ recordAudit: m.recordAudit }));

const { exportOrders, buildOrdersWhere, auditFilters } = await import('@/server/services/orders-export.service');

const NOW = new Date('2026-11-20T23:30:00Z');
const EMPTY_QUERY = { format: 'csv' as const, from: undefined, to: undefined, deliveryStatuses: [], paymentStatuses: [], zones: [] };

const row = (reference = 'CMD-7K3M9QXP') => ({
  reference,
  createdAt: new Date('2026-11-20T14:30:00Z'),
  deliveryStatus: 'PENDING',
  paymentStatus: 'DEPOSIT_PAID',
  zoneType: 'ABIDJAN',
  shippingCountry: 'Côte d’Ivoire',
  shippingCity: 'Cocody',
  shippingAddress: 'Riviera 3, villa 12',
  customerNote: null,
  subtotal: 25000,
  deliveryFee: 1500,
  total: 26500,
  upfrontAmount: 5000,
  customer: { fullName: 'Awa Koné', phone: '+2250700000000', email: 'awa@example.com' },
  items: [{ productNameSnapshot: 'Huile', quantity: 2 }],
  payments: [{ kind: 'DEPOSIT', amount: 5000, voidedAt: null }],
});

beforeEach(() => {
  vi.clearAllMocks();
  m.findMany.mockResolvedValue([row()]);
});

describe('buildOrdersWhere (filtres respectés)', () => {
  it('sans filtre : aucune condition', () => {
    expect(buildOrdersWhere(EMPTY_QUERY)).toEqual({});
  });

  it('période : du premier jour 00:00 inclus au lendemain du dernier jour 00:00 exclu (heure d’Abidjan = UTC)', () => {
    expect(buildOrdersWhere({ ...EMPTY_QUERY, from: '2026-11-01', to: '2026-11-30' })).toEqual({
      createdAt: { gte: new Date('2026-11-01T00:00:00.000Z'), lt: new Date('2026-12-01T00:00:00.000Z') },
    });
    expect(buildOrdersWhere({ ...EMPTY_QUERY, to: '2026-12-31' })).toEqual({ createdAt: { lt: new Date('2027-01-01T00:00:00.000Z') } });
    expect(buildOrdersWhere({ ...EMPTY_QUERY, from: '2026-11-05' })).toEqual({ createdAt: { gte: new Date('2026-11-05T00:00:00.000Z') } });
  });

  it('statuts de livraison, de paiement et zones : « parmi »', () => {
    expect(
      buildOrdersWhere({ ...EMPTY_QUERY, deliveryStatuses: ['PENDING', 'CONFIRMED'], paymentStatuses: ['PAID'], zones: ['ABIDJAN'] }),
    ).toEqual({ deliveryStatus: { in: ['PENDING', 'CONFIRMED'] }, paymentStatus: { in: ['PAID'] }, zoneType: { in: ['ABIDJAN'] } });
  });
});

describe('exportOrders', () => {
  it('interroge la base avec les filtres, dans l’ordre chronologique, avec la limite + 1, sans la note interne ni aucun champ inutile', async () => {
    await exportOrders({ query: { ...EMPTY_QUERY, zones: ['INTERIOR'], from: '2026-11-01' }, adminUserId: 'admin_1', now: NOW });
    expect(m.findMany).toHaveBeenCalledTimes(1);
    const args = m.findMany.mock.calls[0]?.[0];
    expect(args.where).toEqual({ createdAt: { gte: new Date('2026-11-01T00:00:00.000Z') }, zoneType: { in: ['INTERIOR'] } });
    expect(args.orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);
    expect(args.take).toBe(ORDERS_EXPORT_MAX_ROWS + 1);
    expect(args.select.internalNote).toBeUndefined();
    expect(args.select.idempotencyKey).toBeUndefined();
  });

  it('CSV : corps en UTF-8 avec BOM, une ligne par commande, nom de fichier daté', async () => {
    m.findMany.mockResolvedValue([row('CMD-AAAAAAA1'), row('CMD-AAAAAAA2')]);
    const file = await exportOrders({ query: EMPTY_QUERY, adminUserId: 'admin_1', now: NOW });
    expect(file).toMatchObject({ format: 'csv', filename: 'commandes-2026-11-20.csv', rows: 2 });
    const text = file.body.toString('utf8');
    expect(text.startsWith('﻿')).toBe(true);
    expect(text.split('\r\n').filter(Boolean)).toHaveLength(3);
    expect(text).toContain('CMD-AAAAAAA1');
    expect(text).toContain('CMD-AAAAAAA2');
  });

  it('Excel : archive .xlsx', async () => {
    const file = await exportOrders({ query: { ...EMPTY_QUERY, format: 'xlsx' }, adminUserId: 'admin_1', now: NOW });
    expect(file).toMatchObject({ format: 'xlsx', filename: 'commandes-2026-11-20.xlsx', rows: 1 });
    expect(file.body.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('journal : action, compte, format, filtres et nombre de lignes — aucune donnée de client', async () => {
    await exportOrders({
      query: { format: 'csv', from: '2026-11-01', to: '2026-11-30', deliveryStatuses: ['PENDING'], paymentStatuses: [], zones: ['ABIDJAN', 'INTERIOR'] },
      adminUserId: 'admin_1',
      now: NOW,
    });
    expect(m.recordAudit).toHaveBeenCalledTimes(1);
    const entry = m.recordAudit.mock.calls[0]?.[0];
    expect(entry).toEqual({
      action: 'ORDERS_EXPORTED',
      adminUserId: 'admin_1',
      details: {
        format: 'csv',
        from: '2026-11-01',
        to: '2026-11-30',
        deliveryStatuses: 'PENDING',
        paymentStatuses: null,
        zones: 'ABIDJAN,INTERIOR',
        rows: 1,
      },
    });
    const serialized = JSON.stringify(entry);
    for (const personal of ['Awa', 'Koné', '+2250700000000', 'awa@example.com', 'Riviera', 'CMD-']) expect(serialized).not.toContain(personal);
  });

  it('le journal est écrit avant la remise : s’il échoue, aucun fichier ne sort', async () => {
    m.recordAudit.mockRejectedValueOnce(new Error('base indisponible'));
    await expect(exportOrders({ query: EMPTY_QUERY, adminUserId: 'admin_1', now: NOW })).rejects.toThrow('base indisponible');
  });

  it('aucune commande : fichier avec en-têtes seulement, et l’export est journalisé avec 0 ligne', async () => {
    m.findMany.mockResolvedValue([]);
    const file = await exportOrders({ query: EMPTY_QUERY, adminUserId: 'admin_1', now: NOW });
    expect(file.rows).toBe(0);
    expect(m.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ details: expect.objectContaining({ rows: 0 }) }));
  });

  it(`plus de ${ORDERS_EXPORT_MAX_ROWS} commandes : refus clair, rien n’est journalisé ni produit`, async () => {
    m.findMany.mockResolvedValue(Array.from({ length: ORDERS_EXPORT_MAX_ROWS + 1 }, (_, index) => row(`CMD-${String(index).padStart(8, '0')}`)));
    const error = await exportOrders({ query: EMPTY_QUERY, adminUserId: 'admin_1', now: NOW }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(422);
    expect((error as HttpError).message).toContain('Réduisez la période');
    expect(m.recordAudit).not.toHaveBeenCalled();
  });

  it(`exactement ${ORDERS_EXPORT_MAX_ROWS} commandes : accepté`, async () => {
    m.findMany.mockResolvedValue(Array.from({ length: ORDERS_EXPORT_MAX_ROWS }, (_, index) => row(`CMD-${String(index).padStart(8, '0')}`)));
    const file = await exportOrders({ query: EMPTY_QUERY, adminUserId: 'admin_1', now: NOW });
    expect(file.rows).toBe(ORDERS_EXPORT_MAX_ROWS);
  });

  it('auditFilters : listes jointes par une virgule, absent = null', () => {
    expect(auditFilters({ ...EMPTY_QUERY, zones: ['ABIDJAN'], paymentStatuses: ['PAID', 'REFUNDED'] })).toEqual({
      from: null,
      to: null,
      deliveryStatuses: null,
      paymentStatuses: 'PAID,REFUNDED',
      zones: 'ABIDJAN',
    });
  });
});
