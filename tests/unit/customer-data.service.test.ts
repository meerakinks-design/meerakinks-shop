import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CUSTOMER_RETENTION_MONTHS } from '@/lib/constants/retention';
import { HttpError } from '@/server/http';

// Base simulée : on teste la LOGIQUE (ordre, garde-fous, ce qui est effacé et ce qui reste, atomicité, journal).
const m = vi.hoisted(() => {
  const tx = {
    customer: { findUnique: vi.fn(), update: vi.fn() },
    order: { updateMany: vi.fn() },
    receipt: { findMany: vi.fn(), update: vi.fn() },
    emailNotification: { deleteMany: vi.fn() },
    payment: { updateMany: vi.fn() },
    orderStatusHistory: { updateMany: vi.fn() },
  };
  const prisma = {
    customer: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>, _options?: unknown) => callback(tx)),
  };
  return {
    tx,
    prisma,
    auditEntry: vi.fn((entry: unknown, client: unknown) => ({ entry, client })),
    recordAudit: vi.fn(async () => undefined),
    purgeExpiredRateLimits: vi.fn(async () => undefined),
    purgeExpiredAnalytics: vi.fn(async () => 7),
    logInfo: vi.fn(),
    logError: vi.fn(),
  };
});
vi.mock('@/server/db', () => ({ prisma: m.prisma }));
vi.mock('@/server/services/audit.service', () => ({ auditEntry: m.auditEntry, recordAudit: m.recordAudit }));
vi.mock('@/server/services/rate-limit', () => ({ purgeExpiredRateLimits: m.purgeExpiredRateLimits }));
vi.mock('@/server/services/analytics.service', () => ({ purgeExpiredAnalytics: m.purgeExpiredAnalytics }));
vi.mock('@/server/logger', () => ({ logInfo: m.logInfo, logError: m.logError }));

const { anonymizeCustomerByPhone, purgeExpiredCustomers, runRetentionJob } = await import('@/server/services/customer-data.service');

const NOW = new Date('2026-11-20T10:00:00Z');
const RECEIPT = {
  version: 1,
  issuedAt: '2026-01-01T10:00:00.000Z',
  customer: { firstName: 'Awa', lastName: 'Koné', phone: '+2250700000000', email: 'awa@example.com' },
  delivery: { zoneType: 'ABIDJAN', country: 'Côte d’Ivoire', city: 'Cocody', address: 'Riviera 3, villa 12' },
  amounts: { currency: 'XOF', subtotal: 10000, deliveryFee: 1500, total: 11500, upfrontAmount: 2000 },
};
const customerRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'cus_1',
  anonymizedAt: null,
  orders: [
    { id: 'ord_1', deliveryStatus: 'DELIVERED' },
    { id: 'ord_2', deliveryStatus: 'CANCELLED' },
  ],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.prisma.customer.findUnique.mockResolvedValue({ id: 'cus_1' });
  m.tx.customer.findUnique.mockResolvedValue(customerRow());
  m.tx.receipt.findMany.mockResolvedValue([{ id: 'rec_1', data: RECEIPT }]);
});

const run = (overrides: Record<string, unknown> = {}) =>
  anonymizeCustomerByPhone({ phone: '07 00 00 00 00', adminUserId: 'admin_1', now: NOW, ...overrides } as Parameters<typeof anonymizeCustomerByPhone>[0]);
const writes = () => [m.tx.order.updateMany, m.tx.receipt.update, m.tx.emailNotification.deleteMany, m.tx.payment.updateMany, m.tx.orderStatusHistory.updateMany, m.tx.customer.update];

describe('anonymizeCustomerByPhone — effacement sur demande', () => {
  it('cherche le client par son numéro normalisé (E.164), comme à la commande', async () => {
    await run();
    expect(m.prisma.customer.findUnique).toHaveBeenCalledWith({ where: { phone: '+2250700000000' }, select: { id: true } });
  });

  it('refuse un numéro invalide (422) sans toucher à la base', async () => {
    await expect(run({ phone: '12' })).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
    expect(m.prisma.customer.findUnique).not.toHaveBeenCalled();
    expect(m.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('404 quand aucun client n’a ce numéro (ou déjà effacé)', async () => {
    m.prisma.customer.findUnique.mockResolvedValue(null);
    await expect(run()).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    expect(m.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('efface tout ce qui identifie le client, dans UNE transaction', async () => {
    const result = await run();
    expect(result).toEqual({ customerId: 'cus_1', alreadyAnonymized: false, orders: 2, unreadableReceipts: 0 });
    expect(m.prisma.$transaction).toHaveBeenCalledTimes(1);

    expect(m.tx.order.updateMany).toHaveBeenCalledWith({
      where: { customerId: 'cus_1' },
      data: { shippingAddress: 'Adresse supprimée', customerNote: null, internalNote: null },
    });
    const receiptCall = m.tx.receipt.update.mock.calls[0]![0] as { where: unknown; data: { data: Record<string, any> } };
    expect(receiptCall.where).toEqual({ id: 'rec_1' });
    expect(receiptCall.data.data.customer).toEqual({ firstName: 'Client', lastName: 'anonymisé', phone: '', email: null });
    expect(receiptCall.data.data.delivery.address).toBe('Adresse supprimée');
    expect(receiptCall.data.data.amounts).toEqual(RECEIPT.amounts);
    expect(m.tx.payment.updateMany).toHaveBeenCalledWith({ where: { orderId: { in: ['ord_1', 'ord_2'] } }, data: { note: null } });
    expect(m.tx.orderStatusHistory.updateMany).toHaveBeenCalledWith({ where: { orderId: { in: ['ord_1', 'ord_2'] } }, data: { note: null } });
    expect(m.tx.customer.update).toHaveBeenCalledWith({
      where: { id: 'cus_1' },
      data: { firstName: 'Client', lastName: 'anonymisé', phone: 'anon-cus_1', email: null, anonymizedAt: NOW },
    });
  });

  it('supprime les emails adressés au client, jamais ceux destinés à la boutique', async () => {
    await run();
    const call = m.tx.emailNotification.deleteMany.mock.calls[0]![0] as { where: { orderId: unknown; type: { in: string[] } } };
    expect(call.where.orderId).toEqual({ in: ['ord_1', 'ord_2'] });
    expect(call.where.type.in.sort()).toEqual(['ORDER_RECEIVED_CUSTOMER', 'STATUS_CHANGED_CUSTOMER']);
    expect(call.where.type.in).not.toContain('NEW_ORDER_SELLER');
  });

  it('ne supprime AUCUNE commande, ligne, paiement ni historique : seules des colonnes de texte sont vidées', async () => {
    await run();
    for (const model of Object.values(m.tx)) expect((model as Record<string, unknown>).delete).toBeUndefined();
    // Les montants ne sont jamais dans une mise à jour :
    for (const call of [m.tx.order.updateMany, m.tx.payment.updateMany, m.tx.orderStatusHistory.updateMany]) {
      const data = (call.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
      for (const key of ['subtotal', 'deliveryFee', 'total', 'upfrontAmount', 'amount', 'voidReason', 'voidedAt']) expect(data).not.toHaveProperty(key);
    }
  });

  it('journalise dans la même transaction, sans aucune donnée personnelle', async () => {
    await run();
    expect(m.auditEntry).toHaveBeenCalledTimes(1);
    const [entry, client] = m.auditEntry.mock.calls[0]!;
    expect(client).toBe(m.tx);
    expect(entry).toEqual({ action: 'CUSTOMER_ANONYMIZED', adminUserId: 'admin_1', details: { customerId: 'cus_1', orders: 2, trigger: 'request' } });
    const text = JSON.stringify(entry);
    for (const secret of ['0700000000', 'Koné', 'awa@example.com']) expect(text).not.toContain(secret);
    expect(JSON.stringify(m.logInfo.mock.calls)).not.toContain('0700000000');
  });

  it('409 tant qu’une commande est en cours : rien n’est modifié, rien n’est journalisé', async () => {
    m.tx.customer.findUnique.mockResolvedValue(
      customerRow({ orders: [{ id: 'ord_1', deliveryStatus: 'DELIVERED' }, { id: 'ord_2', deliveryStatus: 'SHIPPED' }, { id: 'ord_3', deliveryStatus: 'PENDING' }] }),
    );
    const error = await run().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 409, code: 'CONFLICT' });
    expect((error as HttpError).message).toContain('2 commandes en cours');
    for (const write of writes()) expect(write).not.toHaveBeenCalled();
    expect(m.auditEntry).not.toHaveBeenCalled();
  });

  it('chaque statut non final bloque l’effacement', async () => {
    for (const status of ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED']) {
      m.tx.customer.findUnique.mockResolvedValue(customerRow({ orders: [{ id: 'o', deliveryStatus: status }] }));
      await expect(run()).rejects.toMatchObject({ status: 409 });
    }
  });

  it('est idempotent : une fiche déjà anonymisée n’est pas retouchée ni journalisée', async () => {
    m.tx.customer.findUnique.mockResolvedValue(customerRow({ anonymizedAt: new Date('2026-01-01') }));
    const result = await run();
    expect(result).toMatchObject({ alreadyAnonymized: true, orders: 2 });
    for (const write of writes()) expect(write).not.toHaveBeenCalled();
    expect(m.auditEntry).not.toHaveBeenCalled();
  });

  it('un reçu illisible est vidé plutôt que conservé avec des données personnelles, et signalé', async () => {
    m.tx.receipt.findMany.mockResolvedValue([{ id: 'rec_1', data: 'pas un objet' }]);
    const result = await run();
    expect(result.unreadableReceipts).toBe(1);
    const data = (m.tx.receipt.update.mock.calls[0]![0] as { data: { data: unknown } }).data.data;
    expect(JSON.stringify(data)).not.toContain('pas un objet');
  });

  it('un client sans commande peut être effacé', async () => {
    m.tx.customer.findUnique.mockResolvedValue(customerRow({ orders: [] }));
    m.tx.receipt.findMany.mockResolvedValue([]);
    const result = await run();
    expect(result).toMatchObject({ alreadyAnonymized: false, orders: 0 });
    expect(m.tx.customer.update).toHaveBeenCalled();
  });

  it('une erreur en cours de route fait échouer la transaction entière (rien n’est journalisé comme réussi)', async () => {
    m.tx.payment.updateMany.mockRejectedValueOnce(new Error('connexion perdue'));
    await expect(run()).rejects.toThrow('connexion perdue');
    expect(m.tx.customer.update).not.toHaveBeenCalled();
    expect(m.auditEntry).not.toHaveBeenCalled();
  });
});

describe('purgeExpiredCustomers — fin de conservation', () => {
  beforeEach(() => {
    m.prisma.customer.findMany.mockResolvedValue([{ id: 'cus_1' }, { id: 'cus_2' }]);
    m.prisma.customer.count.mockResolvedValue(0);
  });

  it('sélectionne les clients dont la dernière commande est plus ancienne que la durée, sans commande ouverte', async () => {
    await purgeExpiredCustomers({ now: NOW });
    const query = m.prisma.customer.findMany.mock.calls[0]![0] as { where: any; take: number; orderBy: unknown };
    const cutoff = new Date('2023-11-20T10:00:00.000Z');
    expect(CUSTOMER_RETENTION_MONTHS).toBe(36);
    expect(query.where).toEqual({
      anonymizedAt: null,
      createdAt: { lt: cutoff },
      orders: { none: { OR: [{ createdAt: { gte: cutoff } }, { deliveryStatus: { notIn: ['DELIVERED', 'CANCELLED'] } }] } },
    });
    expect(query.take).toBe(50);
    expect(query.orderBy).toEqual({ createdAt: 'asc' });
  });

  it('anonymise chaque client du lot dans sa propre transaction et journalise une seule ligne', async () => {
    m.tx.customer.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => customerRow({ id: where.id }));
    const summary = await purgeExpiredCustomers({ now: NOW });
    expect(summary).toMatchObject({ anonymized: 2, skipped: 0, failed: 0, remaining: 0, retentionMonths: 36 });
    expect(m.prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(m.recordAudit).toHaveBeenCalledTimes(1);
    expect(m.recordAudit).toHaveBeenCalledWith({ action: 'RETENTION_PURGE', adminUserId: null, details: { anonymized: 2, skipped: 0, failed: 0, retentionMonths: 36 } });
  });

  it('un client dont une commande vient de se rouvrir est ignoré (409), les autres sont traités', async () => {
    m.tx.customer.findUnique
      .mockResolvedValueOnce(customerRow({ id: 'cus_1', orders: [{ id: 'o', deliveryStatus: 'PREPARING' }] }))
      .mockResolvedValueOnce(customerRow({ id: 'cus_2' }));
    const summary = await purgeExpiredCustomers({ now: NOW });
    expect(summary).toMatchObject({ anonymized: 1, skipped: 1, failed: 0 });
  });

  it('une panne sur un client n’empêche pas les autres, et se retrouve dans le journal technique sans donnée personnelle', async () => {
    m.tx.customer.findUnique.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce(customerRow({ id: 'cus_2' }));
    const summary = await purgeExpiredCustomers({ now: NOW });
    expect(summary).toMatchObject({ anonymized: 1, failed: 1 });
    expect(m.logError).toHaveBeenCalledWith('retention.customer_failed', { customerId: 'cus_1' }, expect.any(Error));
    expect(m.recordAudit).toHaveBeenCalledTimes(1);
  });

  it('ne journalise rien quand il n’y a personne à traiter', async () => {
    m.prisma.customer.findMany.mockResolvedValue([]);
    const summary = await purgeExpiredCustomers({ now: NOW });
    expect(summary).toMatchObject({ anonymized: 0, failed: 0 });
    expect(m.recordAudit).not.toHaveBeenCalled();
    expect(m.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('indique combien de clients restent pour le prochain passage', async () => {
    m.tx.customer.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => customerRow({ id: where.id }));
    m.prisma.customer.count.mockResolvedValue(120);
    expect((await purgeExpiredCustomers({ now: NOW })).remaining).toBe(120);
  });

  it('respecte la durée et la taille de lot demandées', async () => {
    await purgeExpiredCustomers({ now: NOW, months: 12, batchSize: 5 });
    const query = m.prisma.customer.findMany.mock.calls[0]![0] as { where: { createdAt: { lt: Date } }; take: number };
    expect(query.where.createdAt.lt).toEqual(new Date('2025-11-20T10:00:00.000Z'));
    expect(query.take).toBe(5);
  });
});

describe('runRetentionJob', () => {
  it('supprime toujours les empreintes anti-abus expirées, même quand la purge des clients est fermée', async () => {
    const result = await runRetentionJob({ purgeCustomers: false });
    expect(m.purgeExpiredRateLimits).toHaveBeenCalledTimes(1);
    expect(m.purgeExpiredAnalytics).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ rateLimitsPurged: true, analyticsPurged: 7, customers: { enabled: false } });
    expect(m.prisma.customer.findMany).not.toHaveBeenCalled();
  });

  it('purge aussi les clients quand elle est activée', async () => {
    m.prisma.customer.findMany.mockResolvedValue([]);
    m.prisma.customer.count.mockResolvedValue(0);
    const result = await runRetentionJob({ purgeCustomers: true, now: NOW });
    expect(m.purgeExpiredRateLimits).toHaveBeenCalledTimes(1);
    expect(result.customers).toMatchObject({ anonymized: 0, retentionMonths: 36 });
  });
});
