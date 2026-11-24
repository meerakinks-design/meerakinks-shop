// Traitement des commandes dans le back-office : statuts, paiements, annulation avec retour du stock, remboursement,
// historique, frais de livraison, note interne, tableau de bord, clients.
//
// Règles : RM-16 (livré ou annulé = définitif), RM-17 (stock non suivi), RM-18 (tout changement est journalisé),
// RM-19 (statut de paiement recalculé), RM-20 à RM-23 (registre des paiements : on annule, on ne supprime pas).
// Chaque écriture se fait dans UNE transaction, protégée contre les doubles clics et les deux onglets ouverts :
// la ligne de commande n'est modifiée que si elle n'a pas bougé depuis sa lecture (updatedAt), sinon 409.
import type { Prisma } from '@prisma/client';
import { ADMIN_PAGE_SIZE } from '@/lib/constants/admin-orders';
import { canTransitionDelivery, DELIVERY_STATUS_LABELS, type DeliveryStatusValue, type PaymentStatusValue } from '@/lib/constants/order-status';
import type { OrderListQuery, DeliveryFeeInput, PaymentInput } from '@/lib/validation/order-admin.schema';
import { formatFcfa } from '@/lib/money';
import { PAYMENT_KIND_LABELS } from '@/lib/constants/payment';
import { computeTotal } from '@/lib/shop/order-amounts';
import { checkNewPayment, collectedSince, derivePaymentStatus, groupOrdersByTodo, planStockRestoration, refundDue, type OrderTodo } from '@/lib/shop/order-admin';
import { netPaid, type PaymentLine } from '@/lib/shop/payments';
import { prisma } from '@/server/db';
import { HttpError } from '@/server/http';
import { auditEntry } from '@/server/services/audit.service';
import { sendOrderEmailsNow } from '@/server/services/notifications.service';
import { parseReceiptData } from '@/server/services/receipt.service';

type Tx = Prisma.TransactionClient;
export interface AdminActor {
  id: string;
}

const TX_OPTIONS = { maxWait: 5_000, timeout: 15_000 } as const;

const notFound = () => new HttpError(404, 'NOT_FOUND', 'Cette commande est introuvable.');
const staleOrder = () => new HttpError(409, 'CONFLICT', 'Cette commande vient d’être modifiée ailleurs. Recharge la page pour voir son état actuel.', { retryable: true });

/** Statuts qui déclenchent un email au client (s'il a laissé son adresse). « En préparation » reste interne. */
const NOTIFIED_STATUSES: readonly DeliveryStatusValue[] = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const PAYMENT_LINE_SELECT = { kind: true, amount: true, voidedAt: true } satisfies Prisma.PaymentSelect;

const MUTABLE_ORDER_SELECT = {
  id: true,
  reference: true,
  updatedAt: true,
  deliveryStatus: true,
  paymentStatus: true,
  zoneType: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  upfrontAmount: true,
  stockRestoredAt: true,
  customer: { select: { email: true } },
  payments: { select: PAYMENT_LINE_SELECT },
} satisfies Prisma.OrderSelect;

async function loadForUpdate(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({ where: { id: orderId }, select: MUTABLE_ORDER_SELECT });
  if (!order) throw notFound();
  return order;
}

/** Écrit la commande seulement si elle n'a pas changé depuis sa lecture. Prisma met `updatedAt` à jour tout seul. */
async function updateOrderGuarded(tx: Tx, order: { id: string; updatedAt: Date }, data: Prisma.OrderUpdateManyMutationInput) {
  const result = await tx.order.updateMany({ where: { id: order.id, updatedAt: order.updatedAt }, data });
  if (result.count !== 1) throw staleOrder();
}

function paymentHistory(tx: Tx, orderId: string, previous: PaymentStatusValue, next: PaymentStatusValue, adminId: string, note: string | null) {
  if (previous === next) return Promise.resolve(null);
  return tx.orderStatusHistory.create({ data: { orderId, kind: 'PAYMENT', previousValue: previous, newValue: next, changedById: adminId, note }, select: { id: true } });
}

// ---------------------------------------------------------------------------
// Statut de livraison, annulation et retour du stock
// ---------------------------------------------------------------------------

export interface DeliveryChangeResult {
  deliveryStatus: DeliveryStatusValue;
  paymentStatus: PaymentStatusValue;
  /** Annulation : le stock suivi a été remis en rayon. */
  stockRestored: boolean;
  /** Montant déjà encaissé qu'il reste à rembourser (commande annulée). */
  refundDue: number;
}

export async function changeDeliveryStatus(input: { orderId: string; to: DeliveryStatusValue; note?: string | undefined; admin: AdminActor }): Promise<DeliveryChangeResult> {
  const outcome = await prisma.$transaction(async (tx) => {
    const order = await loadForUpdate(tx, input.orderId);
    if (!canTransitionDelivery(order.deliveryStatus, input.to)) {
      const definitive = order.deliveryStatus === 'DELIVERED' || order.deliveryStatus === 'CANCELLED';
      throw new HttpError(
        409,
        'CONFLICT',
        definitive
          ? `Une commande « ${DELIVERY_STATUS_LABELS[order.deliveryStatus].toLowerCase()} » ne peut plus changer de statut. Pour une erreur, crée une nouvelle commande.`
          : `On ne peut pas passer de « ${DELIVERY_STATUS_LABELS[order.deliveryStatus]} » à « ${DELIVERY_STATUS_LABELS[input.to]} ».`,
      );
    }

    const nextPayment = derivePaymentStatus({ deliveryStatus: input.to, zoneType: order.zoneType, total: order.total, upfrontAmount: order.upfrontAmount, payments: order.payments });
    const restoreStock = input.to === 'CANCELLED' && order.stockRestoredAt === null;
    // Le garde d'abord : deux annulations simultanées ne peuvent pas toutes deux remettre le stock.
    await updateOrderGuarded(tx, order, { deliveryStatus: input.to, paymentStatus: nextPayment, ...(restoreStock ? { stockRestoredAt: new Date() } : {}) });

    if (restoreStock) {
      const items = await tx.orderItem.findMany({ where: { orderId: order.id }, select: { productId: true, variantId: true, quantity: true } });
      for (const step of planStockRestoration(items)) {
        // `stock: { not: null }` : un stock non suivi (null) n'est jamais touché (RM-17).
        if (step.target === 'variant') await tx.productVariant.updateMany({ where: { id: step.id, stock: { not: null } }, data: { stock: { increment: step.quantity } } });
        else await tx.product.updateMany({ where: { id: step.id, stock: { not: null } }, data: { stock: { increment: step.quantity } } });
      }
    }

    await tx.orderStatusHistory.create({
      data: { orderId: order.id, kind: 'DELIVERY', previousValue: order.deliveryStatus, newValue: input.to, changedById: input.admin.id, note: input.note ?? null },
      select: { id: true },
    });
    await paymentHistory(tx, order.id, order.paymentStatus, nextPayment, input.admin.id, input.to === 'CANCELLED' ? 'Commande annulée' : 'Recalculé');

    const owed = refundDue(input.to, order.payments);
    if (input.to === 'CANCELLED') {
      await auditEntry({ action: 'ORDER_CANCELLED', adminUserId: input.admin.id, details: { reference: order.reference, stockRestored: restoreStock, refundDue: owed } }, tx);
    }
    const email = order.customer.email;
    if (email && NOTIFIED_STATUSES.includes(input.to)) {
      await tx.emailNotification.create({ data: { type: 'STATUS_CHANGED_CUSTOMER', toEmail: email, orderId: order.id, dedupeKey: `${order.reference}:STATUS:${input.to}` }, select: { id: true } });
    }
    return { reference: order.reference, notify: Boolean(email) && NOTIFIED_STATUSES.includes(input.to), result: { deliveryStatus: input.to, paymentStatus: nextPayment, stockRestored: restoreStock, refundDue: owed } satisfies DeliveryChangeResult };
  }, TX_OPTIONS);

  if (outcome.notify) await sendOrderEmailsNow(outcome.reference); // ne lève jamais ; sinon le cron prend le relais
  return outcome.result;
}

// ---------------------------------------------------------------------------
// Registre des paiements
// ---------------------------------------------------------------------------

export interface PaymentResult {
  paymentId: string;
  paymentStatus: PaymentStatusValue;
  netPaid: number;
}

export async function recordPayment(input: { orderId: string; payment: PaymentInput; admin: AdminActor }): Promise<PaymentResult> {
  return prisma.$transaction(async (tx) => {
    const order = await loadForUpdate(tx, input.orderId);
    const { payment } = input;
    const check = checkNewPayment({ deliveryStatus: order.deliveryStatus, zoneType: order.zoneType, total: order.total, payments: order.payments }, payment);
    if (!check.ok) throw new HttpError(422, 'VALIDATION_ERROR', 'Certaines informations sont invalides.', { fields: { [check.field]: [check.message] } });

    const created = await tx.payment.create({
      data: { orderId: order.id, kind: payment.kind, method: payment.method, amount: payment.amount, receivedAt: payment.receivedAt ?? new Date(), recordedById: input.admin.id, note: payment.note ?? null },
      select: { id: true },
    });
    const payments: PaymentLine[] = [...order.payments, { kind: payment.kind, amount: payment.amount, voidedAt: null }];
    const nextPayment = derivePaymentStatus({ deliveryStatus: order.deliveryStatus, zoneType: order.zoneType, total: order.total, upfrontAmount: order.upfrontAmount, payments });
    await updateOrderGuarded(tx, order, { paymentStatus: nextPayment });
    await paymentHistory(tx, order.id, order.paymentStatus, nextPayment, input.admin.id, `${PAYMENT_KIND_LABELS[payment.kind]} de ${formatFcfa(payment.amount)}${payment.note ? ` : ${payment.note}` : ''}`);
    await auditEntry({ action: 'ORDER_PAYMENT_RECORDED', adminUserId: input.admin.id, details: { reference: order.reference, kind: payment.kind, method: payment.method, amount: payment.amount } }, tx);
    return { paymentId: created.id, paymentStatus: nextPayment, netPaid: netPaid(payments) };
  }, TX_OPTIONS);
}

export async function voidPayment(input: { orderId: string; paymentId: string; reason: string; admin: AdminActor }): Promise<PaymentResult> {
  return prisma.$transaction(async (tx) => {
    const order = await loadForUpdate(tx, input.orderId);
    const target = await tx.payment.findFirst({ where: { id: input.paymentId, orderId: order.id }, select: { id: true, kind: true, amount: true, voidedAt: true } });
    if (!target) throw new HttpError(404, 'NOT_FOUND', 'Ce paiement est introuvable sur cette commande.');
    if (target.voidedAt) throw new HttpError(409, 'CONFLICT', 'Ce paiement est déjà annulé.');

    // On ne laisse pas un remboursement « dans le vide » : annuler un encaissement qui a été remboursé donnerait un total négatif.
    const remaining: PaymentLine[] = [];
    let skipped = false;
    for (const line of await tx.payment.findMany({ where: { orderId: order.id }, select: { id: true, ...PAYMENT_LINE_SELECT } })) {
      if (line.id === target.id && !skipped) { skipped = true; continue; }
      remaining.push({ kind: line.kind, amount: line.amount, voidedAt: line.voidedAt });
    }
    if (netPaid(remaining) < 0) throw new HttpError(409, 'CONFLICT', 'Annule d’abord le remboursement lié : le total encaissé serait négatif.');

    await tx.payment.update({ where: { id: target.id }, data: { voidedAt: new Date(), voidReason: input.reason }, select: { id: true } });
    const nextPayment = derivePaymentStatus({ deliveryStatus: order.deliveryStatus, zoneType: order.zoneType, total: order.total, upfrontAmount: order.upfrontAmount, payments: remaining });
    await updateOrderGuarded(tx, order, { paymentStatus: nextPayment });
    await paymentHistory(tx, order.id, order.paymentStatus, nextPayment, input.admin.id, `Paiement annulé : ${input.reason}`);
    await auditEntry({ action: 'ORDER_PAYMENT_VOIDED', adminUserId: input.admin.id, details: { reference: order.reference, kind: target.kind, amount: target.amount } }, tx);
    return { paymentId: target.id, paymentStatus: nextPayment, netPaid: netPaid(remaining) };
  }, TX_OPTIONS);
}

// ---------------------------------------------------------------------------
// Frais de livraison (RM-03, RM-06) et note interne
// ---------------------------------------------------------------------------

export interface FeeResult {
  deliveryFee: number;
  total: number;
  upfrontAmount: number | null;
  paymentStatus: PaymentStatusValue;
}

/** Fixe les frais : le total n'existe qu'à ce moment (jamais inventé). Le reçu, figé avec « à confirmer », est complété. */
export async function setDeliveryFee(input: { orderId: string; fee: DeliveryFeeInput['fee']; admin: AdminActor }): Promise<FeeResult> {
  return prisma.$transaction(async (tx) => {
    const order = await loadForUpdate(tx, input.orderId);
    if (order.deliveryStatus === 'DELIVERED' || order.deliveryStatus === 'CANCELLED') throw new HttpError(409, 'CONFLICT', 'Les frais d’une commande livrée ou annulée ne changent plus.');

    const total = computeTotal(order.subtotal, input.fee);
    if (total === null) throw new HttpError(422, 'VALIDATION_ERROR', 'Les frais sont invalides.', { fields: { fee: ['Renseigne les frais.'] } });
    const paid = netPaid(order.payments);
    if (paid > total) throw new HttpError(422, 'VALIDATION_ERROR', 'Ces frais donnent un total inférieur à ce qui est déjà encaissé.', { fields: { fee: [`Déjà encaissé : ${paid} FCFA, supérieur au total ${total} FCFA.`] } });

    // Abidjan : l'acompte annoncé au client ne change pas (sauf s'il dépasse le total). Ailleurs : paiement intégral = total.
    const upfrontAmount = order.zoneType === 'ABIDJAN' ? (order.upfrontAmount === null ? null : Math.min(order.upfrontAmount, total)) : total;
    const nextPayment = derivePaymentStatus({ deliveryStatus: order.deliveryStatus, zoneType: order.zoneType, total, upfrontAmount, payments: order.payments });
    await updateOrderGuarded(tx, order, { deliveryFee: input.fee, total, upfrontAmount, paymentStatus: nextPayment });

    const receipt = await tx.receipt.findUnique({ where: { orderId: order.id }, select: { data: true } });
    if (receipt) {
      try {
        const data = parseReceiptData(receipt.data);
        await tx.receipt.update({ where: { orderId: order.id }, data: { data: { ...data, amounts: { ...data.amounts, deliveryFee: input.fee, total, upfrontAmount } } }, select: { id: true } });
      } catch {
        // Reçu illisible : le service ne le réécrit pas ; il restera signalé à la génération du PDF.
      }
    }
    await paymentHistory(tx, order.id, order.paymentStatus, nextPayment, input.admin.id, 'Frais de livraison fixés');
    await auditEntry({ action: 'ORDER_FEE_SET', adminUserId: input.admin.id, details: { reference: order.reference, fee: input.fee, total } }, tx);
    return { deliveryFee: input.fee, total, upfrontAmount, paymentStatus: nextPayment };
  }, TX_OPTIONS);
}

export async function setInternalNote(input: { orderId: string; note: string | null }): Promise<void> {
  const result = await prisma.order.updateMany({ where: { id: input.orderId }, data: { internalNote: input.note } });
  if (result.count !== 1) throw notFound();
}

// ---------------------------------------------------------------------------
// Lectures : liste, détail
// ---------------------------------------------------------------------------

export interface AdminOrderRow {
  id: string;
  reference: string;
  createdAt: Date;
  customerName: string;
  zoneType: 'ABIDJAN' | 'INTERIOR' | 'INTERNATIONAL';
  deliveryStatus: DeliveryStatusValue;
  paymentStatus: PaymentStatusValue;
  total: number | null;
  paid: number;
  itemCount: number;
}

export interface AdminOrderPage {
  rows: AdminOrderRow[];
  total: number;
  page: number;
  pageCount: number;
}

const ROW_SELECT = {
  id: true,
  reference: true,
  createdAt: true,
  zoneType: true,
  deliveryStatus: true,
  paymentStatus: true,
  total: true,
  customer: { select: { fullName: true } },
  payments: { select: PAYMENT_LINE_SELECT },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

type RowSource = Prisma.OrderGetPayload<{ select: typeof ROW_SELECT }>;

const toRow = (order: RowSource): AdminOrderRow => ({
  id: order.id,
  reference: order.reference,
  createdAt: order.createdAt,
  customerName: order.customer.fullName.trim(),
  zoneType: order.zoneType,
  deliveryStatus: order.deliveryStatus,
  paymentStatus: order.paymentStatus,
  total: order.total,
  paid: netPaid(order.payments),
  itemCount: order._count.items,
});

export function buildOrderListWhere(query: Pick<OrderListQuery, 'delivery' | 'payment' | 'q'>): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (query.delivery) and.push({ deliveryStatus: query.delivery });
  if (query.payment) and.push({ paymentStatus: { in: [...query.payment] } });
  if (query.q) {
    const digits = query.q.replace(/\D/g, '');
    and.push({
      OR: [
        { reference: { contains: query.q, mode: 'insensitive' } },
        { customer: { fullName: { contains: query.q, mode: 'insensitive' } } },
        ...(digits.length >= 3 ? [{ customer: { phone: { contains: digits } } }] : []),
      ],
    });
  }
  return and.length > 0 ? { AND: and } : {};
}

export async function listAdminOrders(query: OrderListQuery): Promise<AdminOrderPage> {
  const where = buildOrderListWhere(query);
  const total = await prisma.order.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const orders = await prisma.order.findMany({ where, select: ROW_SELECT, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE });
  return { rows: orders.map(toRow), total, page, pageCount };
}

const DETAIL_SELECT = {
  id: true,
  reference: true,
  source: true,
  createdAt: true,
  updatedAt: true,
  deliveryStatus: true,
  paymentStatus: true,
  zoneType: true,
  shippingCountry: true,
  shippingCity: true,
  shippingAddress: true,
  customerNote: true,
  internalNote: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  upfrontAmount: true,
  stockRestoredAt: true,
  customer: { select: { id: true, fullName: true, phone: true, email: true, anonymizedAt: true } },
  items: { select: { id: true, productNameSnapshot: true, variantLabelSnapshot: true, unitPriceSnapshot: true, quantity: true, lineTotal: true }, orderBy: { id: 'asc' } },
  payments: {
    select: { id: true, kind: true, method: true, amount: true, receivedAt: true, note: true, voidedAt: true, voidReason: true, recordedBy: { select: { name: true } } },
    orderBy: [{ receivedAt: 'asc' }, { createdAt: 'asc' }],
  },
  history: { select: { id: true, kind: true, previousValue: true, newValue: true, note: true, createdAt: true, changedBy: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
  receipt: { select: { number: true } },
} satisfies Prisma.OrderSelect;

export type AdminOrderDetail = Prisma.OrderGetPayload<{ select: typeof DETAIL_SELECT }>;

export async function getAdminOrder(id: string): Promise<AdminOrderDetail | null> {
  return prisma.order.findUnique({ where: { id }, select: DETAIL_SELECT });
}

// ---------------------------------------------------------------------------
// Tableau de bord « à traiter aujourd'hui »
// ---------------------------------------------------------------------------

export interface DashboardOrder {
  id: string;
  reference: string;
  createdAt: Date;
  customerName: string;
  deliveryStatus: DeliveryStatusValue;
  paymentStatus: PaymentStatusValue;
  total: number | null;
  payments: PaymentLine[];
  paid: number;
}

export interface AdminDashboard {
  /** Commandes distinctes qui demandent une action. */
  toProcess: number;
  groups: { todo: OrderTodo; orders: DashboardOrder[] }[];
  ordersToday: number;
  collectedToday: number;
  collectedMonth: number;
  /** Au-delà de la limite lue, certaines commandes à traiter ne sont pas listées. */
  truncated: boolean;
}

const DASHBOARD_LIMIT = 300;

/** Début du jour et du mois en UTC : Abidjan est à UTC+0, toute l'année. */
const startOfUtcDay = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const startOfUtcMonth = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

export async function getAdminDashboard(now: Date = new Date()): Promise<AdminDashboard> {
  const dayStart = startOfUtcDay(now);
  const monthStart = startOfUtcMonth(now);

  const [candidates, ordersToday, monthPayments] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { deliveryStatus: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED'] } },
          // Annulées avec de l'argent à rendre, livrées avec un solde dû : l'état de paiement les désigne.
          { deliveryStatus: 'CANCELLED', paymentStatus: { in: ['DEPOSIT_PAID', 'PARTIALLY_PAID', 'PAID'] } },
          { deliveryStatus: 'DELIVERED', paymentStatus: { in: ['TO_CONFIRM', 'DEPOSIT_DUE', 'DEPOSIT_PAID', 'PARTIALLY_PAID'] } },
        ],
      },
      select: { id: true, reference: true, createdAt: true, deliveryStatus: true, paymentStatus: true, total: true, customer: { select: { fullName: true } }, payments: { select: PAYMENT_LINE_SELECT } },
      orderBy: { createdAt: 'asc' },
      take: DASHBOARD_LIMIT + 1,
    }),
    prisma.order.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.payment.findMany({ where: { voidedAt: null, receivedAt: { gte: monthStart } }, select: { kind: true, amount: true, voidedAt: true, receivedAt: true } }),
  ]);

  const truncated = candidates.length > DASHBOARD_LIMIT;
  const orders: DashboardOrder[] = candidates.slice(0, DASHBOARD_LIMIT).map((order) => ({
    id: order.id,
    reference: order.reference,
    createdAt: order.createdAt,
    customerName: order.customer.fullName.trim(),
    deliveryStatus: order.deliveryStatus,
    paymentStatus: order.paymentStatus,
    total: order.total,
    payments: order.payments,
    paid: netPaid(order.payments),
  }));
  const groups = groupOrdersByTodo(orders);

  return {
    toProcess: new Set(groups.flatMap((group) => group.orders.map((order) => order.id))).size,
    groups,
    ordersToday,
    collectedToday: collectedSince(monthPayments, dayStart),
    collectedMonth: collectedSince(monthPayments, monthStart),
    truncated,
  };
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export interface AdminCustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  anonymized: boolean;
  orderCount: number;
  spent: number;
  lastOrderAt: Date | null;
}

export interface AdminCustomerPage {
  rows: AdminCustomerRow[];
  total: number;
  page: number;
  pageCount: number;
}

export function buildCustomerListWhere(q: string): Prisma.CustomerWhereInput {
  if (!q) return {};
  const digits = q.replace(/\D/g, '');
  return {
    OR: [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
    ],
  };
}

export async function listAdminCustomers(input: { q: string; page: number }): Promise<AdminCustomerPage> {
  const where = buildCustomerListWhere(input.q);
  const total = await prisma.customer.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(input.page, pageCount);
  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true, fullName: true, phone: true, email: true, anonymizedAt: true,
      orders: { select: { createdAt: true, payments: { select: PAYMENT_LINE_SELECT } }, orderBy: { createdAt: 'desc' } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * ADMIN_PAGE_SIZE,
    take: ADMIN_PAGE_SIZE,
  });
  const rows = customers.map((customer) => ({
    id: customer.id,
    name: customer.anonymizedAt ? 'Client anonymisé' : customer.fullName.trim(),
    phone: customer.phone,
    email: customer.email,
    anonymized: customer.anonymizedAt !== null,
    orderCount: customer.orders.length,
    spent: customer.orders.reduce((sum, order) => sum + netPaid(order.payments), 0),
    lastOrderAt: customer.orders[0]?.createdAt ?? null,
  }));
  return { rows, total, page, pageCount };
}

const CUSTOMER_DETAIL_SELECT = {
  id: true, fullName: true, phone: true, email: true, anonymizedAt: true, createdAt: true,
  orders: { select: ROW_SELECT, orderBy: { createdAt: 'desc' } },
} satisfies Prisma.CustomerSelect;

export interface AdminCustomerDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  anonymized: boolean;
  createdAt: Date;
  spent: number;
  orders: AdminOrderRow[];
}

export async function getAdminCustomer(id: string): Promise<AdminCustomerDetail | null> {
  const customer = await prisma.customer.findUnique({ where: { id }, select: CUSTOMER_DETAIL_SELECT });
  if (!customer) return null;
  const orders = customer.orders.map(toRow);
  return {
    id: customer.id,
    name: customer.anonymizedAt ? 'Client anonymisé' : customer.fullName.trim(),
    phone: customer.phone,
    email: customer.email,
    anonymized: customer.anonymizedAt !== null,
    createdAt: customer.createdAt,
    spent: orders.reduce((sum, order) => sum + order.paid, 0),
    orders,
  };
}
