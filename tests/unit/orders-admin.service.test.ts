import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/server/http';

// Le service tourne ici contre une base SIMULÉE (aucun PostgreSQL requis) : on vérifie la logique — transitions
// permises, retour du stock, recalcul du statut de paiement, garde contre les modifications simultanées, journal.
// Le comportement réel de PostgreSQL se vérifie avec la liste « à tester à la main » du README.
const { tx, prismaMock, sendOrderEmailsNow, requeueEmail } = vi.hoisted(() => {
  const tx = {
    order: { findUnique: vi.fn(), updateMany: vi.fn() },
    orderItem: { findMany: vi.fn() },
    productVariant: { updateMany: vi.fn() },
    product: { updateMany: vi.fn() },
    orderStatusHistory: { create: vi.fn() },
    emailNotification: { create: vi.fn() },
    payment: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    receipt: { findUnique: vi.fn(), update: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  };
  const prismaMock = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    order: { count: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
    payment: { findMany: vi.fn() },
    customer: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    emailNotification: { findFirst: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  };
  return { tx, prismaMock, sendOrderEmailsNow: vi.fn(), requeueEmail: vi.fn() };
});
vi.mock('@/server/db', () => ({ prisma: prismaMock }));
vi.mock('@/server/services/notifications.service', () => ({ sendOrderEmailsNow, requeueEmail }));
vi.mock('@/server/logger', () => ({ logInfo: vi.fn(), logError: vi.fn() }));

const service = await import('@/server/services/orders-admin.service');

const ADMIN = { id: 'admin_1' };
const UPDATED_AT = new Date('2026-11-22T08:00:00Z');

/** Commande telle que la lit le service avant de la modifier. */
const stored = (overrides: Record<string, unknown> = {}) => ({
  id: 'ord_1',
  reference: 'CMD-7K3M9QXP',
  updatedAt: UPDATED_AT,
  deliveryStatus: 'PENDING',
  paymentStatus: 'DEPOSIT_DUE',
  zoneType: 'ABIDJAN',
  subtotal: 15000,
  deliveryFee: 2000,
  total: 17000,
  upfrontAmount: 2000,
  stockRestoredAt: null,
  customer: { email: null },
  payments: [],
  ...overrides,
});

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error as HttpError;
  }
  throw new Error('La promesse aurait dû être rejetée.');
};

beforeEach(() => {
  vi.clearAllMocks();
  tx.order.findUnique.mockResolvedValue(stored());
  tx.order.updateMany.mockResolvedValue({ count: 1 });
  tx.orderItem.findMany.mockResolvedValue([]);
  tx.productVariant.updateMany.mockResolvedValue({ count: 1 });
  tx.product.updateMany.mockResolvedValue({ count: 1 });
  tx.orderStatusHistory.create.mockResolvedValue({ id: 'h1' });
  tx.emailNotification.create.mockResolvedValue({ id: 'e1' });
  tx.payment.create.mockResolvedValue({ id: 'pay_new' });
  tx.payment.update.mockResolvedValue({ id: 'pay_1' });
  tx.receipt.findUnique.mockResolvedValue(null);
  tx.adminAuditLog.create.mockResolvedValue({ id: 'a1' });
});

describe('changeDeliveryStatus', () => {
  it('fait avancer la commande, journalise (RM-18) et protège contre une modification simultanée', async () => {
    const result = await service.changeDeliveryStatus({ orderId: 'ord_1', to: 'CONFIRMED', note: 'Appelée', admin: ADMIN });

    expect(result).toEqual({ deliveryStatus: 'CONFIRMED', paymentStatus: 'DEPOSIT_DUE', stockRestored: false, refundDue: 0 });
    expect(tx.order.updateMany).toHaveBeenCalledWith({ where: { id: 'ord_1', updatedAt: UPDATED_AT }, data: { deliveryStatus: 'CONFIRMED', paymentStatus: 'DEPOSIT_DUE' } });
    expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
      data: { orderId: 'ord_1', kind: 'DELIVERY', previousValue: 'PENDING', newValue: 'CONFIRMED', changedById: 'admin_1', note: 'Appelée' },
      select: { id: true },
    });
    expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(sendOrderEmailsNow).not.toHaveBeenCalled(); // pas d'adresse email : rien à envoyer
  });

  it('prévient le client par email quand il a laissé une adresse (dédoublonné par commande et statut)', async () => {
    tx.order.findUnique.mockResolvedValue(stored({ customer: { email: 'awa@example.com' } }));
    await service.changeDeliveryStatus({ orderId: 'ord_1', to: 'CONFIRMED', admin: ADMIN });
    expect(tx.emailNotification.create).toHaveBeenCalledWith({
      data: { type: 'STATUS_CHANGED_CUSTOMER', toEmail: 'awa@example.com', orderId: 'ord_1', dedupeKey: 'CMD-7K3M9QXP:STATUS:CONFIRMED' },
      select: { id: true },
    });
    expect(sendOrderEmailsNow).toHaveBeenCalledWith('CMD-7K3M9QXP');
  });

  it('« En préparation » reste interne : aucun email', async () => {
    tx.order.findUnique.mockResolvedValue(stored({ deliveryStatus: 'CONFIRMED', customer: { email: 'awa@example.com' } }));
    await service.changeDeliveryStatus({ orderId: 'ord_1', to: 'PREPARING', admin: ADMIN });
    expect(tx.emailNotification.create).not.toHaveBeenCalled();
  });

  it('refuse un saut d’étape, sans rien écrire', async () => {
    const error = await rejection(service.changeDeliveryStatus({ orderId: 'ord_1', to: 'SHIPPED', admin: ADMIN }));
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(409);
    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(tx.orderStatusHistory.create).not.toHaveBeenCalled();
  });

  it('livrée ou annulée = définitif (RM-16)', async () => {
    for (const status of ['DELIVERED', 'CANCELLED']) {
      tx.order.findUnique.mockResolvedValue(stored({ deliveryStatus: status }));
      const error = await rejection(service.changeDeliveryStatus({ orderId: 'ord_1', to: 'CONFIRMED', admin: ADMIN }));
      expect(error.status).toBe(409);
      expect(error.message).toMatch(/ne peut plus changer/);
    }
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it('annulation : remet le stock suivi (variante ou produit), jamais le stock non suivi, et le note (RM-16, RM-17)', async () => {
    tx.orderItem.findMany.mockResolvedValue([
      { productId: 'prod_a', variantId: null, quantity: 2 },
      { productId: 'prod_b', variantId: 'var_b', quantity: 1 },
      { productId: null, variantId: null, quantity: 5 },
    ]);
    const result = await service.changeDeliveryStatus({ orderId: 'ord_1', to: 'CANCELLED', note: 'Client injoignable', admin: ADMIN });

    expect(result).toMatchObject({ deliveryStatus: 'CANCELLED', paymentStatus: 'CANCELLED', stockRestored: true, refundDue: 0 });
    // Seuls les stocks renseignés sont incrémentés : le filtre `not: null` laisse le stock non suivi tel quel.
    expect(tx.product.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.product.updateMany).toHaveBeenCalledWith({ where: { id: 'prod_a', stock: { not: null } }, data: { stock: { increment: 2 } } });
    expect(tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.productVariant.updateMany).toHaveBeenCalledWith({ where: { id: 'var_b', stock: { not: null } }, data: { stock: { increment: 1 } } });
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'ord_1', updatedAt: UPDATED_AT },
      data: { deliveryStatus: 'CANCELLED', paymentStatus: 'CANCELLED', stockRestoredAt: expect.any(Date) },
    });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'ORDER_CANCELLED', adminUserId: 'admin_1' }) }));
  });

  it('le stock n’est jamais remis deux fois', async () => {
    tx.order.findUnique.mockResolvedValue(stored({ stockRestoredAt: new Date() }));
    tx.orderItem.findMany.mockResolvedValue([{ productId: 'prod_a', variantId: null, quantity: 2 }]);
    const result = await service.changeDeliveryStatus({ orderId: 'ord_1', to: 'CANCELLED', admin: ADMIN });
    expect(result.stockRestored).toBe(false);
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it('annulation d’une commande déjà payée : le statut de paiement reste visible et le montant à rendre est annoncé', async () => {
    tx.order.findUnique.mockResolvedValue(stored({ paymentStatus: 'DEPOSIT_PAID', payments: [{ kind: 'DEPOSIT', amount: 2000, voidedAt: null }] }));
    const result = await service.changeDeliveryStatus({ orderId: 'ord_1', to: 'CANCELLED', admin: ADMIN });
    expect(result).toMatchObject({ paymentStatus: 'DEPOSIT_PAID', refundDue: 2000 });
    // Le statut de paiement n'a pas changé : une seule ligne d'historique (la livraison).
    expect(tx.orderStatusHistory.create).toHaveBeenCalledTimes(1);
  });

  it('annulation d’une commande sans paiement : le statut de paiement passe à Annulé, avec sa ligne d’historique', async () => {
    await service.changeDeliveryStatus({ orderId: 'ord_1', to: 'CANCELLED', admin: ADMIN });
    expect(tx.orderStatusHistory.create).toHaveBeenCalledTimes(2);
    expect(tx.orderStatusHistory.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ kind: 'PAYMENT', previousValue: 'DEPOSIT_DUE', newValue: 'CANCELLED' }) }));
  });

  it('409 si la commande a été modifiée entre la lecture et l’écriture : ni stock, ni journal', async () => {
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    tx.orderItem.findMany.mockResolvedValue([{ productId: 'prod_a', variantId: null, quantity: 2 }]);
    const error = await rejection(service.changeDeliveryStatus({ orderId: 'ord_1', to: 'CANCELLED', admin: ADMIN }));
    expect(error.status).toBe(409);
    expect(error.retryable).toBe(true);
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.orderStatusHistory.create).not.toHaveBeenCalled();
  });

  it('404 pour une commande inconnue', async () => {
    tx.order.findUnique.mockResolvedValue(null);
    expect((await rejection(service.changeDeliveryStatus({ orderId: 'nope', to: 'CONFIRMED', admin: ADMIN }))).status).toBe(404);
  });
});

describe('recordPayment', () => {
  const deposit = { kind: 'DEPOSIT', method: 'WAVE', amount: 2000 } as const;

  it('l’acompte reçu passe la commande à « Acompte reçu », avec historique et audit', async () => {
    const result = await service.recordPayment({ orderId: 'ord_1', payment: deposit, admin: ADMIN });

    expect(result).toEqual({ paymentId: 'pay_new', paymentStatus: 'DEPOSIT_PAID', netPaid: 2000 });
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ orderId: 'ord_1', kind: 'DEPOSIT', method: 'WAVE', amount: 2000, recordedById: 'admin_1', note: null }),
      select: { id: true },
    });
    expect(tx.order.updateMany).toHaveBeenCalledWith({ where: { id: 'ord_1', updatedAt: UPDATED_AT }, data: { paymentStatus: 'DEPOSIT_PAID' } });
    expect(tx.orderStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ kind: 'PAYMENT', previousValue: 'DEPOSIT_DUE', newValue: 'DEPOSIT_PAID', changedById: 'admin_1' }) }));
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'ORDER_PAYMENT_RECORDED' }) }));
  });

  it('le solde complet fait passer la commande à « Paiement intégral reçu »', async () => {
    tx.order.findUnique.mockResolvedValue(stored({ paymentStatus: 'DEPOSIT_PAID', payments: [{ kind: 'DEPOSIT', amount: 2000, voidedAt: null }] }));
    const result = await service.recordPayment({ orderId: 'ord_1', payment: { kind: 'BALANCE', method: 'CASH', amount: 15000 }, admin: ADMIN });
    expect(result).toMatchObject({ paymentStatus: 'PAID', netPaid: 17000 });
  });

  it('refuse un montant supérieur au reste à payer : 422 sur le champ « montant », rien d’écrit', async () => {
    tx.order.findUnique.mockResolvedValue(stored({ paymentStatus: 'DEPOSIT_PAID', payments: [{ kind: 'DEPOSIT', amount: 2000, voidedAt: null }] }));
    const error = await rejection(service.recordPayment({ orderId: 'ord_1', payment: { kind: 'BALANCE', method: 'CASH', amount: 16000 }, admin: ADMIN }));
    expect(error.status).toBe(422);
    expect(error.fields?.amount?.[0]).toMatch(/reste à payer/);
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it('le remboursement total d’une commande annulée la fait passer à « Remboursé »', async () => {
    tx.order.findUnique.mockResolvedValue(stored({ deliveryStatus: 'CANCELLED', paymentStatus: 'DEPOSIT_PAID', payments: [{ kind: 'DEPOSIT', amount: 2000, voidedAt: null }] }));
    const result = await service.recordPayment({ orderId: 'ord_1', payment: { kind: 'REFUND', method: 'WAVE', amount: 2000, note: 'Annulation' }, admin: ADMIN });
    expect(result).toMatchObject({ paymentStatus: 'REFUNDED', netPaid: 0 });
  });

  it('409 si la commande a bougé pendant la saisie (deux onglets ouverts)', async () => {
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    expect((await rejection(service.recordPayment({ orderId: 'ord_1', payment: deposit, admin: ADMIN }))).status).toBe(409);
  });
});

describe('voidPayment (RM-21)', () => {
  const deposit = { id: 'pay_1', kind: 'DEPOSIT', amount: 2000, voidedAt: null };

  beforeEach(() => {
    tx.order.findUnique.mockResolvedValue(stored({ paymentStatus: 'DEPOSIT_PAID', payments: [{ kind: 'DEPOSIT', amount: 2000, voidedAt: null }] }));
    tx.payment.findFirst.mockResolvedValue(deposit);
    tx.payment.findMany.mockResolvedValue([{ id: 'pay_1', kind: 'DEPOSIT', amount: 2000, voidedAt: null }]);
  });

  it('annule sans supprimer : date et motif enregistrés, statut recalculé', async () => {
    const result = await service.voidPayment({ orderId: 'ord_1', paymentId: 'pay_1', reason: 'Saisi en double', admin: ADMIN });
    expect(result).toEqual({ paymentId: 'pay_1', paymentStatus: 'DEPOSIT_DUE', netPaid: 0 });
    expect(tx.payment.update).toHaveBeenCalledWith({ where: { id: 'pay_1' }, data: { voidedAt: expect.any(Date), voidReason: 'Saisi en double' }, select: { id: true } });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'ORDER_PAYMENT_VOIDED' }) }));
  });

  it('refuse d’annuler un paiement déjà annulé', async () => {
    tx.payment.findFirst.mockResolvedValue({ ...deposit, voidedAt: new Date() });
    expect((await rejection(service.voidPayment({ orderId: 'ord_1', paymentId: 'pay_1', reason: 'Erreur', admin: ADMIN }))).status).toBe(409);
    expect(tx.payment.update).not.toHaveBeenCalled();
  });

  it('refuse d’annuler un encaissement déjà remboursé : le total encaissé deviendrait négatif', async () => {
    tx.payment.findMany.mockResolvedValue([
      { id: 'pay_1', kind: 'DEPOSIT', amount: 2000, voidedAt: null },
      { id: 'pay_2', kind: 'REFUND', amount: 2000, voidedAt: null },
    ]);
    const error = await rejection(service.voidPayment({ orderId: 'ord_1', paymentId: 'pay_1', reason: 'Erreur', admin: ADMIN }));
    expect(error.status).toBe(409);
    expect(tx.payment.update).not.toHaveBeenCalled();
  });

  it('404 si le paiement n’appartient pas à cette commande', async () => {
    tx.payment.findFirst.mockResolvedValue(null);
    expect((await rejection(service.voidPayment({ orderId: 'ord_1', paymentId: 'autre', reason: 'Erreur', admin: ADMIN }))).status).toBe(404);
  });
});

describe('setDeliveryFee (RM-03, RM-06)', () => {
  const interior = (overrides: Record<string, unknown> = {}) => stored({ zoneType: 'INTERIOR', paymentStatus: 'TO_CONFIRM', deliveryFee: null, total: null, upfrontAmount: null, ...overrides });

  it('fixe les frais : le total existe enfin, et le paiement attendu = le total hors Abidjan', async () => {
    tx.order.findUnique.mockResolvedValue(interior());
    const result = await service.setDeliveryFee({ orderId: 'ord_1', fee: 5000, admin: ADMIN });
    expect(result).toEqual({ deliveryFee: 5000, total: 20000, upfrontAmount: 20000, paymentStatus: 'TO_CONFIRM' });
    expect(tx.order.updateMany).toHaveBeenCalledWith({ where: { id: 'ord_1', updatedAt: UPDATED_AT }, data: { deliveryFee: 5000, total: 20000, upfrontAmount: 20000, paymentStatus: 'TO_CONFIRM' } });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'ORDER_FEE_SET' }) }));
  });

  it('à Abidjan, l’acompte annoncé au client ne change pas', async () => {
    tx.order.findUnique.mockResolvedValue(stored({ deliveryFee: null, total: null }));
    const result = await service.setDeliveryFee({ orderId: 'ord_1', fee: 1500, admin: ADMIN });
    expect(result).toMatchObject({ total: 16500, upfrontAmount: 2000 });
  });

  it('refuse des frais qui donneraient un total inférieur à l’encaissé', async () => {
    tx.order.findUnique.mockResolvedValue(interior({ payments: [{ kind: 'BALANCE', amount: 18000, voidedAt: null }], paymentStatus: 'PARTIALLY_PAID' }));
    const error = await rejection(service.setDeliveryFee({ orderId: 'ord_1', fee: 1000, admin: ADMIN }));
    expect(error.status).toBe(422);
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it('refuse sur une commande livrée ou annulée', async () => {
    tx.order.findUnique.mockResolvedValue(interior({ deliveryStatus: 'DELIVERED' }));
    expect((await rejection(service.setDeliveryFee({ orderId: 'ord_1', fee: 1000, admin: ADMIN }))).status).toBe(409);
  });

  it('complète le reçu figé (« à confirmer » devient le montant fixé)', async () => {
    tx.order.findUnique.mockResolvedValue(interior());
    tx.receipt.findUnique.mockResolvedValue({
      data: {
        version: 1,
        issuedAt: '2026-11-22T08:00:00.000Z',
        shop: { name: 'Meëra Kinks', legalName: null, address: null, contactPhone: null, contactEmail: null },
        customer: { fullName: 'Awa Koné', phone: '+2250700000000', email: null },
        delivery: { zoneType: 'INTERIOR', country: 'Côte d’Ivoire', city: 'Bouaké', address: 'Quartier Commerce' },
        lines: [{ name: 'Huile', unitPrice: 15000, quantity: 1, lineTotal: 15000 }],
        amounts: { currency: 'XOF', subtotal: 15000, deliveryFee: null, total: null, upfrontAmount: null },
        paymentTerms: 'Paiement intégral avant expédition.',
      },
    });
    await service.setDeliveryFee({ orderId: 'ord_1', fee: 5000, admin: ADMIN });
    expect(tx.receipt.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { data: expect.objectContaining({ amounts: { currency: 'XOF', subtotal: 15000, deliveryFee: 5000, total: 20000, upfrontAmount: 20000 } }) } }),
    );
  });
});

describe('setInternalNote', () => {
  it('enregistre la note, 404 si la commande n’existe pas', async () => {
    prismaMock.order.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.setInternalNote({ orderId: 'ord_1', note: 'Livrer après 17 h' });
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({ where: { id: 'ord_1' }, data: { internalNote: 'Livrer après 17 h' } });
    prismaMock.order.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await rejection(service.setInternalNote({ orderId: 'nope', note: null }))).status).toBe(404);
  });
});

describe('listes et filtres', () => {
  it('buildOrderListWhere : statut de livraison, de paiement et recherche (référence, nom, téléphone en chiffres)', () => {
    expect(service.buildOrderListWhere({ q: '' })).toEqual({});
    expect(service.buildOrderListWhere({ delivery: 'PENDING', payment: ['TO_CONFIRM', 'DEPOSIT_DUE'], q: '' })).toEqual({
      AND: [{ deliveryStatus: 'PENDING' }, { paymentStatus: { in: ['TO_CONFIRM', 'DEPOSIT_DUE'] } }],
    });
    const search = service.buildOrderListWhere({ q: '07 00 00' }) as { AND: { OR: unknown[] }[] };
    expect(search.AND[0]?.OR).toContainEqual({ customer: { phone: { contains: '070000' } } });
    // Un mot sans chiffres ne cherche pas dans les téléphones.
    const byName = service.buildOrderListWhere({ q: 'Awa' }) as { AND: { OR: unknown[] }[] };
    expect(byName.AND[0]?.OR).toHaveLength(3);
  });

  it('buildCustomerListWhere : nom, email, téléphone', () => {
    expect(service.buildCustomerListWhere('')).toEqual({});
    expect((service.buildCustomerListWhere('0700') as { OR: unknown[] }).OR).toContainEqual({ phone: { contains: '0700' } });
  });
});

describe('getAdminDashboard', () => {
  const row = (overrides: Record<string, unknown>) => ({
    id: 'o1',
    reference: 'CMD-AAAAAAAA',
    createdAt: new Date('2026-11-21T10:00:00Z'),
    deliveryStatus: 'PENDING',
    paymentStatus: 'DEPOSIT_DUE',
    total: 17000,
    customer: { fullName: 'Awa Koné' },
    payments: [],
    ...overrides,
  });

  it('regroupe ce qui reste à faire, compte les commandes distinctes et calcule l’encaissé du jour et du mois', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      row({ id: 'o1' }),
      row({ id: 'o2', deliveryStatus: 'SHIPPED', paymentStatus: 'PAID', payments: [{ kind: 'FULL', amount: 5000, voidedAt: null }], total: 5000 }),
      row({ id: 'o3', deliveryStatus: 'CANCELLED', paymentStatus: 'DEPOSIT_PAID', payments: [{ kind: 'DEPOSIT', amount: 2000, voidedAt: null }] }),
    ]);
    prismaMock.order.count.mockResolvedValue(4);
    prismaMock.payment.findMany.mockResolvedValue([
      { kind: 'DEPOSIT', amount: 2000, voidedAt: null, receivedAt: new Date('2026-11-22T09:00:00Z') },
      { kind: 'FULL', amount: 5000, voidedAt: null, receivedAt: new Date('2026-11-10T09:00:00Z') },
    ]);

    const dashboard = await service.getAdminDashboard(new Date('2026-11-22T15:00:00Z'));

    expect(dashboard.groups.map((group) => group.todo)).toEqual(['CONFIRM', 'COLLECT', 'DELIVER', 'REFUND']);
    expect(dashboard.toProcess).toBe(3);
    expect(dashboard.ordersToday).toBe(4);
    expect(dashboard.collectedToday).toBe(2000);
    expect(dashboard.collectedMonth).toBe(7000);
    expect(dashboard.truncated).toBe(false);
    // Le « jour » commence à minuit UTC : Abidjan est à UTC+0.
    expect(prismaMock.order.count).toHaveBeenCalledWith({ where: { createdAt: { gte: new Date('2026-11-22T00:00:00Z') } } });
  });
});

describe('getAdminDashboard : courbes des indicateurs', () => {
  const NOW = new Date('2026-11-22T15:00:00Z');

  it('lit les paiements depuis le plus ancien du début de mois et du début des 30 jours, puis dessine les trois séries', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      { id: 'o1', reference: 'CMD-AAAAAAAA', createdAt: new Date('2026-11-21T10:00:00Z'), deliveryStatus: 'PENDING', paymentStatus: 'DEPOSIT_DUE', total: 17000, customer: { fullName: 'Awa Koné' }, payments: [] },
    ]);
    prismaMock.order.count.mockResolvedValue(1);
    prismaMock.payment.findMany.mockResolvedValue([
      { kind: 'DEPOSIT', amount: 2000, voidedAt: null, receivedAt: new Date('2026-11-22T09:00:00Z') },
      { kind: 'FULL', amount: 5000, voidedAt: null, receivedAt: new Date('2026-11-10T09:00:00Z') },
      { kind: 'FULL', amount: 4000, voidedAt: null, receivedAt: new Date('2026-10-30T09:00:00Z') },
    ]);

    const { series, collectedMonth, collectedToday } = await service.getAdminDashboard(NOW);

    // 30 jours glissants : le 24 octobre est avant le 1er novembre, c'est lui qui borne la lecture des paiements.
    expect(prismaMock.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { voidedAt: null, receivedAt: { gte: new Date('2026-10-24T00:00:00Z') } } }));
    // Les chiffres des tuiles ne changent pas : le paiement du 30 octobre n'entre pas dans « ce mois-ci ».
    expect(collectedToday).toBe(2000);
    expect(collectedMonth).toBe(7000);

    expect(series.orders).toHaveLength(30);
    expect(series.orders.find((point) => point.day === '2026-11-21')?.value).toBe(1);
    expect(series.collected).toHaveLength(30);
    expect(series.collected.find((point) => point.day === '2026-10-30')?.value).toBe(4000);
    expect(series.collected.find((point) => point.day === '2026-11-22')?.value).toBe(2000);
    // Cumul du mois : tous les jours de novembre, la courbe s'arrête à aujourd'hui.
    expect(series.monthCollected).toHaveLength(30);
    expect(series.monthCollected.find((point) => point.day === '2026-11-22')?.value).toBe(7000);
    expect(series.monthCollected.find((point) => point.day === '2026-11-23')?.value).toBeNull();
  });
});

describe('resendOrderEmail (bouton « Renvoyer »)', () => {
  const failed = (overrides: Record<string, unknown> = {}) => ({ id: 'mail_1', type: 'ORDER_RECEIVED_CUSTOMER', status: 'FAILED', order: { reference: 'CMD-7K3M9QXP' }, ...overrides });

  beforeEach(() => {
    prismaMock.emailNotification.findFirst.mockResolvedValue(failed());
    prismaMock.adminAuditLog.create.mockResolvedValue({ id: 'a1' });
    requeueEmail.mockResolvedValue(true);
  });

  it('relance un email abandonné, tente tout de suite l’envoi et journalise le geste', async () => {
    await expect(service.resendOrderEmail({ orderId: 'ord_1', emailId: 'mail_1', admin: ADMIN })).resolves.toEqual({ queued: true });
    expect(prismaMock.emailNotification.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'mail_1', orderId: 'ord_1' } }));
    expect(requeueEmail).toHaveBeenCalledWith('mail_1');
    expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'EMAIL_REQUEUED', adminUserId: 'admin_1', details: { reference: 'CMD-7K3M9QXP', type: 'ORDER_RECEIVED_CUSTOMER' } }) }));
    expect(sendOrderEmailsNow).toHaveBeenCalledWith('CMD-7K3M9QXP');
  });

  it('refuse un email qui n’est pas en échec : rien n’est relancé', async () => {
    prismaMock.emailNotification.findFirst.mockResolvedValue(failed({ status: 'SENT' }));
    const error = await rejection(service.resendOrderEmail({ orderId: 'ord_1', emailId: 'mail_1', admin: ADMIN }));
    expect(error.status).toBe(409);
    expect(requeueEmail).not.toHaveBeenCalled();
    expect(sendOrderEmailsNow).not.toHaveBeenCalled();
  });

  it('404 si l’email n’appartient pas à cette commande', async () => {
    prismaMock.emailNotification.findFirst.mockResolvedValue(null);
    const error = await rejection(service.resendOrderEmail({ orderId: 'ord_1', emailId: 'mail_x', admin: ADMIN }));
    expect(error.status).toBe(404);
    expect(requeueEmail).not.toHaveBeenCalled();
  });

  it('409 à réessayer si l’email vient d’être relancé ailleurs', async () => {
    requeueEmail.mockResolvedValue(false);
    const error = await rejection(service.resendOrderEmail({ orderId: 'ord_1', emailId: 'mail_1', admin: ADMIN }));
    expect(error.status).toBe(409);
    expect(prismaMock.adminAuditLog.create).not.toHaveBeenCalled();
    expect(sendOrderEmailsNow).not.toHaveBeenCalled();
  });
});
