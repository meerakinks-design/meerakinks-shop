import { ANALYTICS_ALERT_DAILY_CAP, ANALYTICS_DETAIL_RETENTION_DAYS, ANALYTICS_SESSION_GAP_MINUTES } from '@/lib/constants/retention';
import { STORE_SETTINGS_ID } from '@/lib/constants/store';
import { TRACK_LIMITS, isTrackTarget, type StoredEventType } from '@/lib/analytics/events';
import { classifySource, referrerHost, sanitizeTrackPath, type DeviceInfo, type GeoInfo } from '@/lib/analytics/classify';
import type { TrackBody } from '@/lib/validation/track.schema';
import { prisma } from '@/server/db';

// Analytique maison (cahier §7.6, P-43 à P-45). Aucune adresse IP et aucun user-agent brut n'arrivent ici : la route
// ne transmet que le résultat de `classify.ts` (pays, région, ville approximatifs, type d'appareil, navigateur,
// provenance). Aucun lien avec `Customer` ni `Order`. La base est injectable pour les tests (`db`).

export type AnalyticsDb = typeof prisma;

export interface TrackContext {
  geo: GeoInfo;
  device: DeviceInfo;
  /** Hôte du site (en-tête Host) : un référent de ce même site n'est pas une provenance. */
  selfHost: string | null;
  now?: Date;
}

export interface TrackResult {
  recorded: boolean;
  isNewVisitor: boolean;
  isNewVisit: boolean;
}

const NOT_RECORDED: TrackResult = { recorded: false, isNewVisitor: false, isNewVisit: false };

const isUniqueViolation = (error: unknown): boolean => typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';

const secondsBetween = (from: Date, to: Date) => Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));

const MAX_PAGE_SECONDS = 30 * 60;

/**
 * Enregistre un événement de la liste fermée. Le serveur décide seul de l'ouverture d'une visite : la première
 * activité d'un navigateur, ou la première après `ANALYTICS_SESSION_GAP_MINUTES` d'inactivité, crée une ligne
 * `visit_start` qui porte la provenance de CETTE visite. La durée vient des signaux d'activité.
 */
export async function recordTrackEvent(input: TrackBody, context: TrackContext, db: AnalyticsDb = prisma): Promise<TrackResult> {
  const now = context.now ?? new Date();
  const path = input.path ? sanitizeTrackPath(input.path) : null;
  // Une page jamais mesurée (back-office, API, commande) ne crée rien, pas même une visite.
  if ((input.type === 'page_view' || input.type === 'product_view') && !path) return NOT_RECORDED;
  if (input.type === 'click' && !isTrackTarget(input.target)) return NOT_RECORDED;

  const source = classifySource({ utmSource: input.utmSource ?? null, referrerHost: referrerHost(input.referrer, context.selfHost), inApp: context.device.inAppSource });

  let session = await db.visitorSession.findUnique({ where: { visitorKey: input.visitorKey }, select: { id: true, lastSeenAt: true } });
  let isNewVisitor = false;
  let isNewVisit = false;

  if (!session) {
    isNewVisitor = true;
    isNewVisit = true;
    try {
      session = await db.visitorSession.create({
        data: {
          visitorKey: input.visitorKey,
          firstSeenAt: now,
          lastSeenAt: now,
          country: context.geo.country,
          region: context.geo.region,
          city: context.geo.city,
          source,
          landingPath: path,
          device: context.device.device,
          browser: context.device.browser,
        },
        select: { id: true, lastSeenAt: true },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Deux premières requêtes simultanées du même navigateur : l'autre a créé la ligne.
      isNewVisitor = false;
      isNewVisit = false;
      session = await db.visitorSession.findUnique({ where: { visitorKey: input.visitorKey }, select: { id: true, lastSeenAt: true } });
      if (!session) return NOT_RECORDED;
    }
  } else {
    isNewVisit = secondsBetween(session.lastSeenAt, now) > ANALYTICS_SESSION_GAP_MINUTES * 60;
  }

  const sessionId = session.id;
  const event = (type: StoredEventType, extra: { path?: string | null; target?: string | null } = {}) =>
    db.visitorEvent.create({ data: { sessionId, type, path: extra.path ?? null, target: extra.target ?? null, occurredAt: now }, select: { id: true } });

  if (isNewVisit) await event('visit_start', { path, target: source });

  switch (input.type) {
    case 'page_view': {
      if (!isNewVisit) {
        // Durée de la page précédente = temps écoulé jusqu'à celle-ci.
        const previous = await db.visitorEvent.findFirst({ where: { sessionId, type: 'page_view', durationSeconds: null }, orderBy: { occurredAt: 'desc' }, select: { id: true, occurredAt: true } });
        if (previous) await db.visitorEvent.update({ where: { id: previous.id }, data: { durationSeconds: Math.min(secondsBetween(previous.occurredAt, now), MAX_PAGE_SECONDS) } });
      }
      await event('page_view', { path });
      break;
    }
    case 'click':
      await event('click', { path, target: input.target ?? null });
      break;
    case 'heartbeat': {
      const seconds = isNewVisit ? 0 : Math.min(input.seconds ?? 0, TRACK_LIMITS.heartbeatMaxSeconds);
      if (seconds > 0) {
        await db.visitorSession.update({ where: { id: sessionId }, data: { durationSeconds: { increment: seconds } }, select: { id: true } });
        const visit = await db.visitorEvent.findFirst({ where: { sessionId, type: 'visit_start' }, orderBy: { occurredAt: 'desc' }, select: { id: true } });
        if (visit) await db.visitorEvent.update({ where: { id: visit.id }, data: { durationSeconds: { increment: seconds } }, select: { id: true } });
      }
      break;
    }
    default:
      // Parcours : product_view, add_to_cart, remove_from_cart, checkout_started, order_submitted.
      await event(input.type, { path });
  }

  await db.visitorSession.update({ where: { id: sessionId }, data: { lastSeenAt: now }, select: { id: true } });
  return { recorded: true, isNewVisitor, isNewVisit };
}

// ---------------------------------------------------------------------------
// Alerte « Nouvelle visite » (P-45)
// ---------------------------------------------------------------------------

export type ArrivalOutcome = 'queued' | 'already_sent' | 'unknown_visitor' | 'no_recipient' | 'daily_cap_reached';

export interface ArrivalResult {
  outcome: ArrivalOutcome;
  /** Clé de déduplication de la ligne d'envoi créée (pour la tentative immédiate). */
  dedupeKey?: string;
}

export const newVisitorDedupeKey = (sessionId: string) => `NEW_VISITOR:${sessionId}`;
export const sessionIdFromDedupeKey = (dedupeKey: string): string | null => (dedupeKey.startsWith('NEW_VISITOR:') ? dedupeKey.slice('NEW_VISITOR:'.length) || null : null);

/** Début de la journée en heure d'Abidjan (UTC+0 toute l'année). */
export const startOfAbidjanDay = (now: Date): Date => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

/**
 * Appelée UNE fois par navigateur ayant accepté la mesure. La marque `arrivalAlertSentAt` est posée par une mise à
 * jour conditionnelle : même si la route est appelée deux fois, une seule alerte naît. Les emails de commande
 * gardent la priorité (RM-34) : au-delà du plafond quotidien, la visite reste visible dans l'onglet Analytics et seul
 * l'email est ignoré. La ligne rejoint la boîte d'envoi existante : mêmes reprises par le cron.
 */
export async function recordArrival(visitorKey: string, options: { now?: Date } = {}, db: AnalyticsDb = prisma): Promise<ArrivalResult> {
  const now = options.now ?? new Date();
  const session = await db.visitorSession.findUnique({ where: { visitorKey }, select: { id: true } });
  if (!session) return { outcome: 'unknown_visitor' };

  const claim = await db.visitorSession.updateMany({ where: { id: session.id, arrivalAlertSentAt: null }, data: { arrivalAlertSentAt: now } });
  if (claim.count !== 1) return { outcome: 'already_sent' };

  const settings = await db.storeSettings.findUnique({ where: { id: STORE_SETTINGS_ID }, select: { notificationEmail: true } });
  const recipient = settings?.notificationEmail?.trim();
  if (!recipient) return { outcome: 'no_recipient' };

  const sentToday = await db.emailNotification.count({ where: { type: 'NEW_VISITOR', createdAt: { gte: startOfAbidjanDay(now) } } });
  if (sentToday >= ANALYTICS_ALERT_DAILY_CAP) return { outcome: 'daily_cap_reached' };

  const dedupeKey = newVisitorDedupeKey(session.id);
  try {
    await db.emailNotification.create({ data: { type: 'NEW_VISITOR', toEmail: recipient, dedupeKey, nextAttemptAt: now }, select: { id: true } });
  } catch (error) {
    if (isUniqueViolation(error)) return { outcome: 'already_sent' };
    throw error;
  }
  return { outcome: 'queued', dedupeKey };
}

// ---------------------------------------------------------------------------
// Effacement et purge
// ---------------------------------------------------------------------------

/** « Refuser » : efface ce qui concerne ce navigateur (visite et événements, en cascade). Renvoie le nombre de visiteurs effacés. */
export async function forgetVisitor(visitorKey: string, db: AnalyticsDb = prisma): Promise<number> {
  const result = await db.visitorSession.deleteMany({ where: { visitorKey } });
  return result.count;
}

/** Cron quotidien : supprime le détail des visites au-delà de `ANALYTICS_DETAIL_RETENTION_DAYS` (les événements partent en cascade). */
export async function purgeExpiredAnalytics(options: { now?: Date; days?: number } = {}, db: AnalyticsDb = prisma): Promise<number> {
  const now = options.now ?? new Date();
  const cutoff = new Date(now.getTime() - (options.days ?? ANALYTICS_DETAIL_RETENTION_DAYS) * 24 * 60 * 60 * 1000);
  const result = await db.visitorSession.deleteMany({ where: { lastSeenAt: { lt: cutoff } } });
  return result.count;
}
