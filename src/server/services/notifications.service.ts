import type { EmailType, Prisma } from '@prisma/client';
import { STORE_SETTINGS_ID } from '@/lib/constants/store';
import { prisma } from '@/server/db';
import { createResendTransport, getEmailConfig, EmailSendError, scrubError, type EmailConfig, type EmailTransport, type OutgoingEmail } from '@/server/integrations/resend';
import { renderReceiptPdf } from '@/server/integrations/pdf';
import { logError, logInfo } from '@/server/logger';
import { buildCustomerReceivedEmail, buildNewVisitorEmail, buildSellerNewOrderEmail, buildStatusChangedEmail, type EmailContent } from '@/server/services/email-templates';
import { loadOrderDocument } from '@/server/services/receipt-pdf.service';
import { parseReceiptData } from '@/server/services/receipt.service';

// Envoi des emails par « boîte d'envoi » (RM-34, RM-35). Une commande ne dépend JAMAIS d'un email : la ligne
// `EmailNotification` naît dans la transaction de la commande, l'envoi se fait après (tentative immédiate), et le cron
// reprend ce qui a échoué. Chaque ligne est « réservée » par une mise à jour conditionnelle : deux exécutions
// simultanées (tentative immédiate + cron) ne peuvent pas envoyer deux fois le même email.

export const EMAIL_MAX_ATTEMPTS = 6;
/** Délai avant la tentative n+1 après l'échec de la tentative n. Après la 6e tentative : abandon (statut FAILED). */
export const EMAIL_RETRY_DELAYS_MINUTES: readonly [number, ...number[]] = [1, 5, 15, 60, 180];
/** Une ligne « en cours » dont l'exécution a été interrompue redevient disponible après ce délai. */
export const EMAIL_LEASE_MINUTES = 10;

const CRON_LIMIT = 20;
const CRON_TIME_BUDGET_MS = 25_000;
const CRON_TIMEOUT_MS = 10_000;
/** Tentative immédiate, pendant la requête du client : courte, pour ne jamais le faire attendre longtemps. */
const IMMEDIATE_LIMIT = 5;
const IMMEDIATE_CONCURRENCY = 2;
const IMMEDIATE_TIMEOUT_MS = 4_000;
const IMMEDIATE_TIME_BUDGET_MS = 6_000;
const MAX_STORED_ERROR_LENGTH = 500;

/** Délai avant la tentative suivante, selon le numéro de la tentative qui vient d'échouer (1 = la première). */
export function retryDelayMinutes(failedAttempt: number): number {
  const index = Math.min(Math.max(failedAttempt, 1), EMAIL_RETRY_DELAYS_MINUTES.length) - 1;
  return EMAIL_RETRY_DELAYS_MINUTES[index] ?? EMAIL_RETRY_DELAYS_MINUTES[0];
}

export interface OutboxOptions {
  limit?: number;
  timeBudgetMs?: number;
  timeoutMs?: number;
  concurrency?: number;
  /** Se limiter aux emails d'une commande (tentative immédiate). */
  orderReference?: string;
  now?: () => Date;
  transport?: EmailTransport;
}

export interface OutboxSummary {
  /** false : RESEND_API_KEY ou EMAIL_FROM manquant ; rien n'a été touché, les emails attendent. */
  configured: boolean;
  claimed: number;
  sent: number;
  retrying: number;
  failed: number;
  skipped: number;
}

const emptySummary = (): OutboxSummary => ({ configured: false, claimed: 0, sent: 0, retrying: 0, failed: 0, skipped: 0 });

const DUE_SELECT = { id: true, type: true, toEmail: true, dedupeKey: true, status: true, attempts: true, nextAttemptAt: true, orderId: true } satisfies Prisma.EmailNotificationSelect;
type DueRow = Prisma.EmailNotificationGetPayload<{ select: typeof DUE_SELECT }>;

/** Erreur définitive : réessayer ne servirait à rien. */
class PermanentEmailError extends Error {}

interface ComposedEmail extends EmailContent {
  replyTo?: string;
  attachments?: OutgoingEmail['attachments'];
}

/** Construit l'email d'une ligne. Le reçu PDF n'est joint qu'à l'alerte de la vendeuse. */
async function composeEmail(row: DueRow): Promise<ComposedEmail> {
  if (row.type === 'NEW_VISITOR') {
    const settings = await prisma.storeSettings.findUnique({ where: { id: STORE_SETTINGS_ID }, select: { storeName: true } });
    return buildNewVisitorEmail({ storeName: settings?.storeName ?? 'Meëra Kinks', source: 'direct', landingPath: '/', country: null, region: null, city: null });
  }
  if (!row.orderId) throw new PermanentEmailError('Email sans commande associée.');
  const order = await loadOrderDocument({ id: row.orderId });
  if (!order?.receipt) throw new PermanentEmailError('Commande ou reçu introuvable.');

  let receipt;
  try {
    receipt = parseReceiptData(order.receipt.data);
  } catch {
    throw new PermanentEmailError('Les données figées du reçu sont illisibles.');
  }
  const settings = await prisma.storeSettings.findUnique({ where: { id: STORE_SETTINGS_ID }, select: { storeName: true, contactEmail: true } });
  const storeName = settings?.storeName ?? receipt.shop.name;

  const type: EmailType = row.type;
  switch (type) {
    case 'NEW_ORDER_SELLER': {
      const pdf = await renderReceiptPdf({ number: order.receipt.number, reference: order.reference, receipt, payments: order.payments });
      return {
        ...buildSellerNewOrderEmail({ reference: order.reference, receipt, customerNote: order.customerNote, storeName }),
        ...(receipt.customer.email ? { replyTo: receipt.customer.email } : {}),
        attachments: [{ filename: `${order.receipt.number}.pdf`, content: Buffer.from(pdf).toString('base64') }],
      };
    }
    case 'ORDER_RECEIVED_CUSTOMER':
      return { ...buildCustomerReceivedEmail({ reference: order.reference, receipt, storeName }), ...(settings?.contactEmail ? { replyTo: settings.contactEmail } : {}) };
    case 'STATUS_CHANGED_CUSTOMER':
      return { ...buildStatusChangedEmail({ reference: order.reference, receipt, storeName, deliveryStatus: order.deliveryStatus }), ...(settings?.contactEmail ? { replyTo: settings.contactEmail } : {}) };
  }
}

function describeFailure(error: unknown): { message: string; retryable: boolean; status: number | null } {
  if (error instanceof EmailSendError) return { message: error.message, retryable: error.retryable, status: error.status };
  if (error instanceof PermanentEmailError) return { message: error.message, retryable: false, status: null };
  return { message: scrubError(error instanceof Error ? error.message : String(error)), retryable: true, status: null };
}

interface RowContext {
  config: EmailConfig;
  transport: EmailTransport;
  clock: () => Date;
  timeoutMs: number;
}

async function settle(id: string, data: Prisma.EmailNotificationUpdateManyMutationInput): Promise<void> {
  // Seulement si la ligne est toujours « en cours » : un renvoi manuel entre-temps ne doit pas être écrasé.
  await prisma.emailNotification.updateMany({ where: { id, status: 'PROCESSING' }, data });
}

async function processRow(row: DueRow, context: RowContext): Promise<'sent' | 'retrying' | 'failed' | 'skipped'> {
  const now = context.clock();
  // Réservation atomique : réussit pour UNE seule exécution (les valeurs lues doivent être encore celles de la base).
  const claim = await prisma.emailNotification.updateMany({
    where: { id: row.id, status: row.status, nextAttemptAt: row.nextAttemptAt },
    data: { status: 'PROCESSING', attempts: { increment: 1 }, nextAttemptAt: new Date(now.getTime() + EMAIL_LEASE_MINUTES * 60_000) },
  });
  if (claim.count !== 1) return 'skipped';

  const attempt = row.attempts + 1;
  try {
    const email = await composeEmail(row);
    // Une clé par tentative : une réponse d'échec mise en cache par le prestataire ne doit pas bloquer la suivante.
    const sent = await context.transport.send(
      { ...email, from: context.config.from, to: row.toEmail, idempotencyKey: `${row.dedupeKey}:a${attempt}` },
      { timeoutMs: context.timeoutMs },
    );
    await settle(row.id, { status: 'SENT', sentAt: context.clock(), providerMessageId: sent.id, lastError: null });
    logInfo('email.sent', { type: row.type, attempt });
    return 'sent';
  } catch (error) {
    const failure = describeFailure(error);
    const giveUp = !failure.retryable || attempt >= EMAIL_MAX_ATTEMPTS;
    await settle(row.id, {
      status: giveUp ? 'FAILED' : 'PENDING',
      nextAttemptAt: new Date(context.clock().getTime() + (giveUp ? 0 : retryDelayMinutes(attempt)) * 60_000),
      lastError: failure.message.slice(0, MAX_STORED_ERROR_LENGTH),
    });
    // Jamais d'adresse ni de contenu dans le journal : le type, le numéro de tentative et le code HTTP suffisent.
    logError('email.failed', { type: row.type, attempt, status: failure.status, retryable: failure.retryable, abandoned: giveUp });
    return giveUp ? 'failed' : 'retrying';
  }
}

async function runWithConcurrency<T>(items: readonly T[], concurrency: number, task: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await task(item as T);
    }
  });
  await Promise.all(workers);
}

/**
 * Traite les emails en attente dont l'heure est venue : réserve, construit, envoie, puis marque envoyé, à réessayer ou
 * abandonné. Sans clé Resend ni expéditeur valide, ne touche à rien (les emails attendent la configuration).
 */
export async function processOutbox(options: OutboxOptions = {}): Promise<OutboxSummary> {
  const summary = emptySummary();
  const config = getEmailConfig();
  if (!config) {
    logInfo('email.not_configured');
    return summary;
  }
  summary.configured = true;

  const clock = options.now ?? (() => new Date());
  const context: RowContext = {
    config,
    transport: options.transport ?? createResendTransport(config.apiKey),
    clock,
    timeoutMs: options.timeoutMs ?? CRON_TIMEOUT_MS,
  };
  const started = Date.now();
  const budget = options.timeBudgetMs ?? CRON_TIME_BUDGET_MS;

  // « Disponible » = en attente, ou « en cours » mais dont la réservation a expiré (exécution interrompue).
  const due = await prisma.emailNotification.findMany({
    where: {
      status: { in: ['PENDING', 'PROCESSING'] },
      nextAttemptAt: { lte: clock() },
      ...(options.orderReference ? { order: { reference: options.orderReference } } : {}),
    },
    orderBy: { nextAttemptAt: 'asc' },
    take: options.limit ?? CRON_LIMIT,
    select: DUE_SELECT,
  });

  await runWithConcurrency(due, options.concurrency ?? 1, async (row) => {
    if (Date.now() - started > budget) return; // pas de nouvelle ligne : elle sera reprise à la prochaine exécution
    const outcome = await processRow(row, context);
    if (outcome === 'skipped') {
      summary.skipped += 1;
      return;
    }
    summary.claimed += 1;
    if (outcome === 'sent') summary.sent += 1;
    else if (outcome === 'retrying') summary.retrying += 1;
    else summary.failed += 1;
  });

  return summary;
}

/**
 * Tentative immédiate après la création d'une commande (cahier §6.3, point 4). Ne lève JAMAIS : la commande est déjà
 * enregistrée, un échec ici laisse simplement les lignes en attente pour le cron.
 */
export async function sendOrderEmailsNow(reference: string): Promise<OutboxSummary | null> {
  try {
    return await processOutbox({
      orderReference: reference,
      limit: IMMEDIATE_LIMIT,
      concurrency: IMMEDIATE_CONCURRENCY,
      timeoutMs: IMMEDIATE_TIMEOUT_MS,
      timeBudgetMs: IMMEDIATE_TIME_BUDGET_MS,
    });
  } catch (error) {
    logError('email.immediate_failed', { reference }, error);
    return null;
  }
}

/** Relance un email abandonné (bouton « Renvoyer » du back-office, étape 10). Vrai si la ligne était bien à l'état FAILED. */
export async function requeueEmail(id: string): Promise<boolean> {
  const result = await prisma.emailNotification.updateMany({
    where: { id, status: 'FAILED' },
    data: { status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), lastError: null },
  });
  return result.count === 1;
}
