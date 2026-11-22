import { Prisma } from '@prisma/client';
import {
  ANONYMIZED_ADDRESS,
  CUSTOMER_RETENTION_MONTHS,
  FINAL_DELIVERY_STATUSES,
  RETENTION_BATCH_SIZE,
} from '@/lib/constants/retention';
import { anonymizeReceiptData, anonymizedCustomerFields, retentionCutoff } from '@/lib/retention';
import { DEFAULT_DIAL_CODE, normalizePhone } from '@/lib/shop/phone';
import { prisma } from '@/server/db';
import { HttpError } from '@/server/http';
import { logError, logInfo } from '@/server/logger';
import { auditEntry, recordAudit } from '@/server/services/audit.service';
import { purgeExpiredRateLimits } from '@/server/services/rate-limit';

// Conservation des données clients (cahier §10.2) : on ANONYMISE, on ne supprime pas. Une commande figée garde ses
// montants, ses articles et ses dates (RM-04, RM-24) : la comptabilité et l'historique ne cassent jamais. Seul ce qui
// permet d'identifier une personne disparaît : nom, téléphone, email, adresse, messages et notes.

const TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 20_000 } as const;
/** Emails adressés AU CLIENT : supprimés avec ses données (les emails destinés à la boutique n'en contiennent pas). */
const CUSTOMER_EMAIL_TYPES = ['ORDER_RECEIVED_CUSTOMER', 'STATUS_CHANGED_CUSTOMER'] as const;
const isFinal = (status: string) => (FINAL_DELIVERY_STATUSES as readonly string[]).includes(status);

export interface AnonymizeResult {
  customerId: string;
  /** true : la fiche l'était déjà, rien n'a été modifié. */
  alreadyAnonymized: boolean;
  orders: number;
  /** Reçus dont le contenu n'était pas un objet lisible : vidés plutôt que conservés avec des données personnelles. */
  unreadableReceipts: number;
}

/** Une fiche, dans la transaction de l'appelant : tout réussit ensemble ou rien ne change. */
async function anonymizeCustomerInTransaction(tx: Prisma.TransactionClient, customerId: string, now: Date): Promise<AnonymizeResult> {
  const customer = await tx.customer.findUnique({
    where: { id: customerId },
    select: { id: true, anonymizedAt: true, orders: { select: { id: true, deliveryStatus: true } } },
  });
  if (!customer) throw new HttpError(404, 'NOT_FOUND', 'Client introuvable.');

  const orderIds = customer.orders.map((order) => order.id);
  if (customer.anonymizedAt) return { customerId, alreadyAnonymized: true, orders: orderIds.length, unreadableReceipts: 0 };

  const open = customer.orders.filter((order) => !isFinal(order.deliveryStatus)).length;
  if (open > 0) {
    throw new HttpError(
      409,
      'CONFLICT',
      `Ce client a ${open} commande${open > 1 ? 's' : ''} en cours (ni livrée ni annulée). Termine ou annule ${open > 1 ? 'ces commandes' : 'cette commande'} d’abord.`,
    );
  }

  // Adresse, message du client et notes de la vendeuse : texte libre, donc susceptible de contenir n'importe quoi.
  await tx.order.updateMany({
    where: { customerId },
    data: { shippingAddress: ANONYMIZED_ADDRESS, customerNote: null, internalNote: null },
  });

  // Reçus figés : le client et l'adresse sont recopiés dans le JSON au moment de la commande.
  const receipts = await tx.receipt.findMany({ where: { orderId: { in: orderIds } }, select: { id: true, data: true } });
  let unreadableReceipts = 0;
  for (const receipt of receipts) {
    const anonymized = anonymizeReceiptData(receipt.data);
    if (anonymized === null) unreadableReceipts += 1;
    await tx.receipt.update({
      where: { id: receipt.id },
      data: { data: anonymized === null ? Prisma.JsonNull : (anonymized as Prisma.InputJsonObject) },
    });
  }

  await tx.emailNotification.deleteMany({ where: { orderId: { in: orderIds }, type: { in: [...CUSTOMER_EMAIL_TYPES] } } });
  // Notes libres des paiements et des changements de statut. `voidReason` (motif d'annulation) reste : il décrit
  // l'opération, pas la personne.
  await tx.payment.updateMany({ where: { orderId: { in: orderIds } }, data: { note: null } });
  await tx.orderStatusHistory.updateMany({ where: { orderId: { in: orderIds } }, data: { note: null } });

  await tx.customer.update({ where: { id: customerId }, data: anonymizedCustomerFields(customerId, now) });
  return { customerId, alreadyAnonymized: false, orders: orderIds.length, unreadableReceipts };
}

/**
 * Effacement SUR DEMANDE du client (le numéro est celui que la personne a donné en commandant). Réservé au propriétaire
 * par la route. Refusé tant qu'une commande n'est ni livrée ni annulée. Journalisé sans donnée personnelle.
 */
export async function anonymizeCustomerByPhone(input: { dialCode?: string; phone: string; adminUserId: string; now?: Date }): Promise<AnonymizeResult> {
  const normalized = normalizePhone(input.dialCode ?? DEFAULT_DIAL_CODE, input.phone);
  if (!normalized.ok) throw new HttpError(422, 'VALIDATION_ERROR', normalized.message, { fields: { phone: [normalized.message] } });

  const customer = await prisma.customer.findUnique({ where: { phone: normalized.e164 }, select: { id: true } });
  if (!customer) throw new HttpError(404, 'NOT_FOUND', 'Aucun client enregistré avec ce numéro (ou déjà effacé).');

  const now = input.now ?? new Date();
  const result = await prisma.$transaction(async (tx) => {
    const outcome = await anonymizeCustomerInTransaction(tx, customer.id, now);
    if (!outcome.alreadyAnonymized) {
      await auditEntry(
        { action: 'CUSTOMER_ANONYMIZED', adminUserId: input.adminUserId, details: { customerId: customer.id, orders: outcome.orders, trigger: 'request' } },
        tx,
      );
    }
    return outcome;
  }, TRANSACTION_OPTIONS);

  logInfo('customer.anonymized', { customerId: customer.id, orders: result.orders, trigger: 'request' });
  return result;
}

export interface PurgeSummary {
  cutoff: string;
  retentionMonths: number;
  anonymized: number;
  /** Clients devenus non effaçables entre la sélection et le traitement (une commande s'est rouverte). */
  skipped: number;
  failed: number;
  /** Clients restant à traiter après ce passage : le prochain passage continue. */
  remaining: number;
}

/**
 * Clients à anonymiser : première fiche créée avant la date limite, DERNIÈRE commande plus ancienne que la durée de
 * conservation, et aucune commande ouverte. Un client sans commande est jugé sur sa date de création.
 */
function expiredCustomersWhere(cutoff: Date): Prisma.CustomerWhereInput {
  return {
    anonymizedAt: null,
    createdAt: { lt: cutoff },
    orders: { none: { OR: [{ createdAt: { gte: cutoff } }, { deliveryStatus: { notIn: [...FINAL_DELIVERY_STATUSES] } }] } },
  };
}

/** Fin de conservation : un passage de la tâche planifiée (un lot de clients). */
export async function purgeExpiredCustomers(options: { now?: Date; months?: number; batchSize?: number } = {}): Promise<PurgeSummary> {
  const now = options.now ?? new Date();
  const months = options.months ?? CUSTOMER_RETENTION_MONTHS;
  const batchSize = options.batchSize ?? RETENTION_BATCH_SIZE;
  const cutoff = retentionCutoff(now, months);
  const where = expiredCustomersWhere(cutoff);

  const batch = await prisma.customer.findMany({ where, select: { id: true }, orderBy: { createdAt: 'asc' }, take: batchSize });

  let anonymized = 0;
  let skipped = 0;
  let failed = 0;
  for (const { id } of batch) {
    try {
      // Une transaction par client : l'échec d'un client n'empêche pas les autres.
      const outcome = await prisma.$transaction((tx) => anonymizeCustomerInTransaction(tx, id, now), TRANSACTION_OPTIONS);
      if (!outcome.alreadyAnonymized) anonymized += 1;
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) skipped += 1;
      else {
        failed += 1;
        logError('retention.customer_failed', { customerId: id }, error);
      }
    }
  }

  const remaining = await prisma.customer.count({ where });
  if (anonymized > 0 || failed > 0) {
    await recordAudit({ action: 'RETENTION_PURGE', adminUserId: null, details: { anonymized, skipped, failed, retentionMonths: months } });
  }
  const summary: PurgeSummary = { cutoff: cutoff.toISOString(), retentionMonths: months, anonymized, skipped, failed, remaining };
  logInfo('retention.purge', { ...summary });
  return summary;
}

/** Tâche planifiée quotidienne : empreintes anti-abus expirées (toujours) et fin de conservation des clients (si activée). */
export async function runRetentionJob(options: { purgeCustomers: boolean; now?: Date }): Promise<{ rateLimitsPurged: true; customers: PurgeSummary | { enabled: false } }> {
  await purgeExpiredRateLimits();
  if (!options.purgeCustomers) return { rateLimitsPurged: true, customers: { enabled: false } };
  return { rateLimitsPurged: true, customers: await purgeExpiredCustomers(options.now ? { now: options.now } : {}) };
}
