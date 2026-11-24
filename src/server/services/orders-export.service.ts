import type { Prisma } from '@prisma/client';
import { ORDERS_EXPORT_MAX_ROWS, type OrdersExportFormat } from '@/lib/constants/orders-export';
import { buildExportTable, exportFilename, toCsv, type ExportOrder } from '@/lib/orders-export';
import { toXlsx } from '@/lib/orders-export-xlsx';
import type { OrdersExportQuery } from '@/lib/validation/orders-export.schema';
import { prisma } from '@/server/db';
import { HttpError } from '@/server/http';
import { recordAudit } from '@/server/services/audit.service';

// Export des commandes (cahier P-55, RM-48). Le fichier est construit à la demande, remis dans la réponse et jamais
// conservé. Le journal d'audit est écrit AVANT la remise : si l'écriture échoue, le fichier ne sort pas.

const EXPORT_SELECT = {
  reference: true,
  createdAt: true,
  deliveryStatus: true,
  paymentStatus: true,
  zoneType: true,
  shippingCountry: true,
  shippingCity: true,
  shippingAddress: true,
  customerNote: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  upfrontAmount: true,
  customer: { select: { fullName: true, phone: true, email: true } },
  items: { orderBy: { id: 'asc' }, select: { productNameSnapshot: true, quantity: true } },
  payments: { select: { kind: true, amount: true, voidedAt: true } },
} satisfies Prisma.OrderSelect;

const DAY_MS = 86_400_000;

/**
 * Filtres → requête. La période se lit à l'heure d'Abidjan (= UTC) : « du 1er au 30 » va du 1er à 00:00 inclus au
 * 1er du mois suivant à 00:00 exclu, donc le dernier jour est entièrement compris.
 */
export function buildOrdersWhere(query: Pick<OrdersExportQuery, 'from' | 'to' | 'deliveryStatuses' | 'paymentStatuses' | 'zones'>): Prisma.OrderWhereInput {
  const createdAt: Prisma.DateTimeFilter = {};
  if (query.from) createdAt.gte = new Date(`${query.from}T00:00:00.000Z`);
  if (query.to) createdAt.lt = new Date(new Date(`${query.to}T00:00:00.000Z`).getTime() + DAY_MS);

  return {
    ...(createdAt.gte || createdAt.lt ? { createdAt } : {}),
    ...(query.deliveryStatuses.length > 0 ? { deliveryStatus: { in: query.deliveryStatuses } } : {}),
    ...(query.paymentStatuses.length > 0 ? { paymentStatus: { in: query.paymentStatuses } } : {}),
    ...(query.zones.length > 0 ? { zoneType: { in: query.zones } } : {}),
  };
}

/** Filtres tels qu'on les inscrit au journal : valeurs simples, aucune donnée de client. */
export function auditFilters(query: OrdersExportQuery): Record<string, string | null> {
  const list = (values: readonly string[]): string | null => (values.length > 0 ? values.join(',') : null);
  return {
    from: query.from ?? null,
    to: query.to ?? null,
    deliveryStatuses: list(query.deliveryStatuses),
    paymentStatuses: list(query.paymentStatuses),
    zones: list(query.zones),
  };
}

export interface OrdersExportFile {
  format: OrdersExportFormat;
  filename: string;
  body: Buffer;
  rows: number;
}

export async function exportOrders(input: { query: OrdersExportQuery; adminUserId: string; now?: Date }): Promise<OrdersExportFile> {
  const { query } = input;
  const now = input.now ?? new Date();

  // Une ligne de plus que la limite suffit pour savoir qu'elle est dépassée, sans tout charger.
  const orders = await prisma.order.findMany({
    where: buildOrdersWhere(query),
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: ORDERS_EXPORT_MAX_ROWS + 1,
    select: EXPORT_SELECT,
  });
  if (orders.length > ORDERS_EXPORT_MAX_ROWS) {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      `Plus de ${ORDERS_EXPORT_MAX_ROWS.toLocaleString('fr-FR')} commandes correspondent à ces filtres. Réduisez la période ou ajoutez un filtre.`,
    );
  }

  const table = buildExportTable(orders as ExportOrder[]);
  const body = query.format === 'xlsx' ? await toXlsx(table) : Buffer.from(toCsv(table), 'utf8');

  await recordAudit({
    action: 'ORDERS_EXPORTED',
    adminUserId: input.adminUserId,
    details: { format: query.format, ...auditFilters(query), rows: orders.length },
  });

  return { format: query.format, filename: exportFilename(query.format, now), body, rows: orders.length };
}
