import { average, buildFunnel, countByDay, dayKeys, periodStart, tally, type Counted, type FunnelStep } from '@/lib/analytics/aggregate';
import { TARGET_LABELS, isTrackTarget } from '@/lib/analytics/events';
import { formatGeo, sourceLabel } from '@/lib/analytics/classify';
import { prisma } from '@/server/db';

// Lecture seule des statistiques de l'analytique maison pour l'onglet « Analytics » (propriétaire). Rien de personnel :
// pays, région, ville approximatifs, appareil, provenance, pages et boutons. Les décomptes se font en base, bornés.

export type StatsDb = typeof prisma;

const ROW_LIMIT = 20_000;

export interface RecentVisitor {
  id: string;
  place: string;
  source: string;
  device: string;
  browser: string;
  landingPath: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  durationSeconds: number;
  eventCount: number;
}

export interface AnalyticsOverview {
  days: number;
  since: Date;
  visitors: number;
  newVisitors: number;
  returningVisitors: number;
  visits: number;
  pageViews: number;
  avgVisitSeconds: number | null;
  perDay: { day: string; count: number }[];
  sources: Counted[];
  countries: Counted[];
  cities: Counted[];
  devices: Counted[];
  browsers: Counted[];
  topPages: Counted[];
  topClicks: Counted[];
  funnel: FunnelStep[];
  recent: RecentVisitor[];
}

const FUNNEL_STEPS = [
  { key: 'product_view', label: 'Ont vu un produit' },
  { key: 'add_to_cart', label: 'Ont ajouté au panier' },
  { key: 'checkout_started', label: 'Ont démarré la commande' },
  { key: 'order_submitted', label: 'Ont envoyé la commande' },
] as const;

export async function getAnalyticsOverview(days: number, now: Date = new Date(), db: StatsDb = prisma): Promise<AnalyticsOverview> {
  const since = periodStart(now, days);
  const inPeriod = { gte: since };

  const [visitEvents, sessions, pageViews, pageGroups, clickGroups, recent, ...funnelRows] = await Promise.all([
    db.visitorEvent.findMany({ where: { type: 'visit_start', occurredAt: inPeriod }, select: { occurredAt: true, target: true, durationSeconds: true }, take: ROW_LIMIT }),
    db.visitorSession.findMany({ where: { lastSeenAt: inPeriod }, select: { firstSeenAt: true, country: true, region: true, city: true, device: true, browser: true }, take: ROW_LIMIT }),
    db.visitorEvent.count({ where: { type: 'page_view', occurredAt: inPeriod } }),
    db.visitorEvent.groupBy({ by: ['path'], where: { type: 'page_view', occurredAt: inPeriod }, _count: { _all: true }, orderBy: { _count: { path: 'desc' } }, take: 10 }),
    db.visitorEvent.groupBy({ by: ['target'], where: { type: 'click', occurredAt: inPeriod }, _count: { _all: true }, orderBy: { _count: { target: 'desc' } }, take: 12 }),
    db.visitorSession.findMany({
      orderBy: { lastSeenAt: 'desc' },
      take: 20,
      select: { id: true, country: true, region: true, city: true, source: true, device: true, browser: true, landingPath: true, firstSeenAt: true, lastSeenAt: true, durationSeconds: true, _count: { select: { events: true } } },
    }),
    ...FUNNEL_STEPS.map((step) => db.visitorEvent.findMany({ where: { type: step.key, occurredAt: inPeriod }, distinct: ['sessionId'], select: { sessionId: true }, take: ROW_LIMIT })),
  ]);

  const newVisitors = sessions.filter((session) => session.firstSeenAt >= since).length;
  const durations = visitEvents.map((event) => event.durationSeconds ?? 0);

  return {
    days,
    since,
    visitors: sessions.length,
    newVisitors,
    returningVisitors: sessions.length - newVisitors,
    visits: visitEvents.length,
    pageViews,
    avgVisitSeconds: average(durations),
    perDay: countByDay(visitEvents.map((event) => event.occurredAt), dayKeys(since, days)),
    sources: tally(visitEvents.map((event) => (event.target ? sourceLabel(event.target) : null)), { fallback: 'Accès direct' }),
    countries: tally(sessions.map((session) => session.country), { fallback: 'Pays inconnu', limit: 10 }),
    cities: tally(sessions.map((session) => (session.city ? [session.city, session.country].filter(Boolean).join(', ') : null)), { fallback: 'Ville inconnue', limit: 10 }),
    devices: tally(sessions.map((session) => session.device), { fallback: 'Inconnu' }),
    browsers: tally(sessions.map((session) => session.browser), { fallback: 'Inconnu', limit: 8 }),
    topPages: pageGroups.map((group) => ({ label: group.path ?? '/', count: group._count._all })),
    topClicks: clickGroups.map((group) => ({ label: isTrackTarget(group.target) ? TARGET_LABELS[group.target] : (group.target ?? 'Autre'), count: group._count._all })),
    funnel: buildFunnel(FUNNEL_STEPS.map((step, index) => ({ key: step.key, label: step.label, visitors: funnelRows[index]?.length ?? 0 }))),
    recent: recent.map((session) => ({
      id: session.id,
      place: formatGeo({ country: session.country, region: session.region, city: session.city }),
      source: sourceLabel(session.source),
      device: session.device ?? 'inconnu',
      browser: session.browser ?? 'inconnu',
      landingPath: session.landingPath,
      firstSeenAt: session.firstSeenAt,
      lastSeenAt: session.lastSeenAt,
      durationSeconds: session.durationSeconds,
      eventCount: session._count.events,
    })),
  };
}

export interface JourneyStep {
  id: string;
  type: string;
  path: string | null;
  target: string | null;
  durationSeconds: number | null;
  occurredAt: Date;
}

export interface VisitorJourney {
  visitor: RecentVisitor;
  steps: JourneyStep[];
}

/** Parcours d'un visiteur, du plus ancien au plus récent (500 événements au plus). Null si la visite n'existe plus. */
export async function getVisitorJourney(id: string, db: StatsDb = prisma): Promise<VisitorJourney | null> {
  const session = await db.visitorSession.findUnique({
    where: { id },
    select: {
      id: true, country: true, region: true, city: true, source: true, device: true, browser: true, landingPath: true, firstSeenAt: true, lastSeenAt: true, durationSeconds: true,
      events: { orderBy: { occurredAt: 'asc' }, take: 500, select: { id: true, type: true, path: true, target: true, durationSeconds: true, occurredAt: true } },
    },
  });
  if (!session) return null;
  return {
    visitor: {
      id: session.id,
      place: formatGeo({ country: session.country, region: session.region, city: session.city }),
      source: sourceLabel(session.source),
      device: session.device ?? 'inconnu',
      browser: session.browser ?? 'inconnu',
      landingPath: session.landingPath,
      firstSeenAt: session.firstSeenAt,
      lastSeenAt: session.lastSeenAt,
      durationSeconds: session.durationSeconds,
      eventCount: session.events.length,
    },
    steps: session.events,
  };
}
