import { describe, expect, it } from 'vitest';
import { ANALYTICS_ALERT_DAILY_CAP, ANALYTICS_SESSION_GAP_MINUTES } from '@/lib/constants/retention';
import { parseUserAgent } from '@/lib/analytics/classify';
import {
  forgetVisitor,
  newVisitorDedupeKey,
  purgeExpiredAnalytics,
  recordArrival,
  recordTrackEvent,
  sessionIdFromDedupeKey,
  startOfAbidjanDay,
  type AnalyticsDb,
  type TrackContext,
} from '@/server/services/analytics.service';

// Base simulée en mémoire : on teste la LOGIQUE (ouverture d'une visite, durées, déduplication de l'alerte, plafond,
// effacement, purge), pas Prisma.

type Row = Record<string, any>;

function createFakeDb(options: { notificationEmail?: string | null; alertsToday?: number } = {}) {
  const sessions: Row[] = [];
  const events: Row[] = [];
  const emails: Row[] = [];
  let counter = 0;
  const nextId = (prefix: string) => `${prefix}${++counter}`;
  const matchSession = (where: Row, row: Row) =>
    Object.entries(where).every(([key, value]) => {
      if (value && typeof value === 'object' && 'lt' in value) return row[key] < value.lt;
      return row[key] === value;
    });

  const db = {
    visitorSession: {
      findUnique: async ({ where }: Row) => sessions.find((row) => matchSession(where, row)) ?? null,
      create: async ({ data }: Row) => {
        if (sessions.some((row) => row.visitorKey === data.visitorKey)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        const row = { id: nextId('s'), durationSeconds: 0, arrivalAlertSentAt: null, ...data };
        sessions.push(row);
        return row;
      },
      update: async ({ where, data }: Row) => {
        const row = sessions.find((item) => item.id === where.id) as Row;
        for (const [key, value] of Object.entries(data)) {
          row[key] = value && typeof value === 'object' && 'increment' in value ? (row[key] ?? 0) + value.increment : value;
        }
        return row;
      },
      updateMany: async ({ where, data }: Row) => {
        const hits = sessions.filter((row) => matchSession(where, row));
        hits.forEach((row) => Object.assign(row, data));
        return { count: hits.length };
      },
      deleteMany: async ({ where }: Row) => {
        const hits = sessions.filter((row) => matchSession(where, row));
        for (const row of hits) {
          sessions.splice(sessions.indexOf(row), 1);
          for (let i = events.length - 1; i >= 0; i -= 1) if (events[i]?.sessionId === row.id) events.splice(i, 1);
        }
        return { count: hits.length };
      },
    },
    visitorEvent: {
      create: async ({ data }: Row) => {
        const row = { id: nextId('e'), durationSeconds: null, ...data };
        events.push(row);
        return row;
      },
      findFirst: async ({ where, orderBy }: Row) => {
        const hits = events.filter((row) => Object.entries(where).every(([key, value]) => row[key] === value));
        return hits.sort((a, b) => (orderBy?.occurredAt === 'desc' ? b.occurredAt - a.occurredAt : a.occurredAt - b.occurredAt))[0] ?? null;
      },
      update: async ({ where, data }: Row) => {
        const row = events.find((item) => item.id === where.id) as Row;
        for (const [key, value] of Object.entries(data)) {
          row[key] = value && typeof value === 'object' && 'increment' in value ? (row[key] ?? 0) + value.increment : value;
        }
        return row;
      },
    },
    storeSettings: { findUnique: async () => ({ notificationEmail: options.notificationEmail === undefined ? 'boutique@example.com' : options.notificationEmail }) },
    emailNotification: {
      count: async () => (options.alertsToday ?? 0) + emails.length,
      create: async ({ data }: Row) => {
        if (emails.some((row) => row.dedupeKey === data.dedupeKey)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        emails.push(data);
        return data;
      },
    },
  };
  return { db: db as unknown as AnalyticsDb, sessions, events, emails };
}

const KEY = 'b'.repeat(32);
const T0 = new Date('2026-11-23T10:00:00Z');
const minutes = (count: number) => new Date(T0.getTime() + count * 60_000);
const seconds = (count: number) => new Date(T0.getTime() + count * 1000);

const context = (now: Date, extra: Partial<TrackContext> = {}): TrackContext => ({
  geo: { country: 'Côte d’Ivoire', region: 'Abidjan', city: 'Abidjan' },
  device: parseUserAgent('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'),
  selfHost: 'meerakinks.com',
  now,
  ...extra,
});

describe('première visite', () => {
  it('crée le visiteur, ouvre la visite avec sa provenance et enregistre la page', async () => {
    const { db, sessions, events } = createFakeDb();
    const result = await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/produit/serum?x=1', utmSource: 'instagram' }, context(T0), db);

    expect(result).toEqual({ recorded: true, isNewVisitor: true, isNewVisit: true });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ visitorKey: KEY, country: 'Côte d’Ivoire', region: 'Abidjan', city: 'Abidjan', source: 'instagram', landingPath: '/produit/serum', device: 'mobile', browser: 'Chrome (Android)' });
    expect(events.map((event) => [event.type, event.path, event.target])).toEqual([
      ['visit_start', '/produit/serum', 'instagram'],
      ['page_view', '/produit/serum', null],
    ]);
  });

  it('ne conserve ni adresse IP ni user-agent brut : seules les colonnes grossières existent', async () => {
    const { db, sessions } = createFakeDb();
    await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/' }, context(T0), db);
    const columns = Object.keys(sessions[0] as Row);
    expect(columns.some((name) => /ip|agent|ua$/i.test(name))).toBe(false);
  });

  it('une page jamais mesurée ne crée rien, pas même une visite', async () => {
    const { db, sessions, events } = createFakeDb();
    const result = await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/commande/confirmation?ref=CMD-ABCD2345' }, context(T0), db);
    expect(result.recorded).toBe(false);
    expect(sessions).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it('un bouton hors liste est ignoré', async () => {
    const { db, events } = createFakeDb();
    const result = await recordTrackEvent({ visitorKey: KEY, type: 'click', target: 'pirate' }, context(T0), db);
    expect(result.recorded).toBe(false);
    expect(events).toHaveLength(0);
  });
});

describe('visite en cours et nouvelle visite', () => {
  it('la page suivante garde la même visite et donne sa durée à la page précédente', async () => {
    const { db, events } = createFakeDb();
    await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/' }, context(T0), db);
    const result = await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/cgv' }, context(seconds(42)), db);

    expect(result).toEqual({ recorded: true, isNewVisitor: false, isNewVisit: false });
    expect(events.filter((event) => event.type === 'visit_start')).toHaveLength(1);
    const pages = events.filter((event) => event.type === 'page_view');
    expect(pages[0]?.durationSeconds).toBe(42);
    expect(pages[1]?.durationSeconds).toBeNull();
  });

  it(`après ${ANALYTICS_SESSION_GAP_MINUTES} minutes d’inactivité, la visite suivante est une nouvelle visite du même visiteur`, async () => {
    const { db, sessions, events } = createFakeDb();
    await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/', utmSource: 'whatsapp' }, context(T0), db);
    const result = await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/', utmSource: 'facebook' }, context(minutes(ANALYTICS_SESSION_GAP_MINUTES + 1)), db);

    expect(result).toEqual({ recorded: true, isNewVisitor: false, isNewVisit: true });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.source).toBe('whatsapp');
    expect(events.filter((event) => event.type === 'visit_start').map((event) => event.target)).toEqual(['whatsapp', 'facebook']);
  });

  it('enregistre les boutons de la liste et les étapes du parcours', async () => {
    const { db, events } = createFakeDb();
    await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/produit/serum' }, context(T0), db);
    await recordTrackEvent({ visitorKey: KEY, type: 'click', target: 'product_add', path: '/produit/serum' }, context(seconds(5)), db);
    await recordTrackEvent({ visitorKey: KEY, type: 'add_to_cart', path: '/produit/serum' }, context(seconds(5)), db);
    await recordTrackEvent({ visitorKey: KEY, type: 'checkout_started', path: '/' }, context(seconds(9)), db);
    expect(events.map((event) => event.type)).toEqual(['visit_start', 'page_view', 'click', 'add_to_cart', 'checkout_started']);
    expect(events[2]).toMatchObject({ target: 'product_add' });
  });
});

describe('durée d’activité', () => {
  it('cumule les secondes sur le visiteur et sur la visite en cours', async () => {
    const { db, sessions, events } = createFakeDb();
    await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/' }, context(T0), db);
    await recordTrackEvent({ visitorKey: KEY, type: 'heartbeat', seconds: 15 }, context(seconds(15)), db);
    await recordTrackEvent({ visitorKey: KEY, type: 'heartbeat', seconds: 15 }, context(seconds(30)), db);

    expect(sessions[0]?.durationSeconds).toBe(30);
    expect(events.find((event) => event.type === 'visit_start')?.durationSeconds).toBe(30);
  });

  it('un signal qui ouvre une nouvelle visite ne compte aucune seconde', async () => {
    const { db, sessions } = createFakeDb();
    await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/' }, context(T0), db);
    await recordTrackEvent({ visitorKey: KEY, type: 'heartbeat', seconds: 15 }, context(minutes(120)), db);
    expect(sessions[0]?.durationSeconds).toBe(0);
  });
});

describe('alerte « Nouvelle visite »', () => {
  it('une seule alerte par navigateur, même si la route est appelée deux fois', async () => {
    const { db, emails } = createFakeDb();
    await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/' }, context(T0), db);

    const first = await recordArrival(KEY, { now: seconds(2) }, db);
    const second = await recordArrival(KEY, { now: seconds(3) }, db);

    expect(first.outcome).toBe('queued');
    expect(second.outcome).toBe('already_sent');
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({ type: 'NEW_VISITOR', toEmail: 'boutique@example.com' });
    expect(sessionIdFromDedupeKey(emails[0]?.dedupeKey as string)).toBeTruthy();
  });

  it('n’envoie rien pour un navigateur inconnu', async () => {
    const { db, emails } = createFakeDb();
    expect((await recordArrival(KEY, {}, db)).outcome).toBe('unknown_visitor');
    expect(emails).toHaveLength(0);
  });

  it('sans adresse de notification, la visite reste visible mais aucun email n’est créé', async () => {
    const { db, emails } = createFakeDb({ notificationEmail: null });
    await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/' }, context(T0), db);
    expect((await recordArrival(KEY, {}, db)).outcome).toBe('no_recipient');
    expect(emails).toHaveLength(0);
  });

  it('au-delà du plafond quotidien, seul l’email est ignoré (la visite est enregistrée)', async () => {
    const { db, sessions, emails } = createFakeDb({ alertsToday: ANALYTICS_ALERT_DAILY_CAP });
    await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/' }, context(T0), db);
    expect((await recordArrival(KEY, {}, db)).outcome).toBe('daily_cap_reached');
    expect(emails).toHaveLength(0);
    expect(sessions).toHaveLength(1);
  });

  it('la clé de déduplication porte l’identifiant de la visite et le jour commence à minuit à Abidjan', () => {
    expect(sessionIdFromDedupeKey(newVisitorDedupeKey('s42'))).toBe('s42');
    expect(sessionIdFromDedupeKey('abc:NEW_ORDER_SELLER')).toBeNull();
    expect(startOfAbidjanDay(new Date('2026-11-23T23:59:00Z')).toISOString()).toBe('2026-11-23T00:00:00.000Z');
  });
});

describe('effacement et purge', () => {
  it('le refus efface la visite et ses événements', async () => {
    const { db, sessions, events } = createFakeDb();
    await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/' }, context(T0), db);
    expect(await forgetVisitor(KEY, db)).toBe(1);
    expect(sessions).toHaveLength(0);
    expect(events).toHaveLength(0);
    expect(await forgetVisitor(KEY, db)).toBe(0);
  });

  it('la purge quotidienne supprime le détail au-delà de 90 jours et garde le reste', async () => {
    const { db, sessions } = createFakeDb();
    await recordTrackEvent({ visitorKey: KEY, type: 'page_view', path: '/' }, context(new Date('2026-08-01T10:00:00Z')), db);
    await recordTrackEvent({ visitorKey: 'c'.repeat(32), type: 'page_view', path: '/' }, context(new Date('2026-11-10T10:00:00Z')), db);
    expect(await purgeExpiredAnalytics({ now: T0 }, db)).toBe(1);
    expect(sessions.map((row) => row.visitorKey)).toEqual(['c'.repeat(32)]);
  });
});
