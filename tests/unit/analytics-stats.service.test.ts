import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({ prisma: {} }));

const { getAnalyticsOverview } = await import('@/server/services/analytics-stats.service');

// Base simulée : le service reçoit son client en paramètre, on lui en donne un qui répond selon le type d'événement demandé.
const NOW = new Date('2026-11-25T15:00:00Z');
const visit = (sessionId: string, at: string, durationSeconds: number | null) => ({ sessionId, occurredAt: new Date(at), target: null, durationSeconds });
const session = (firstSeenAt: string) => ({ firstSeenAt: new Date(firstSeenAt), country: 'CI', region: 'Abidjan', city: 'Abidjan', device: 'mobile', browser: 'Chrome', source: 'direct', landingPath: '/', lastSeenAt: new Date(firstSeenAt), durationSeconds: 0, id: 's', _count: { events: 1 } });

function fakeDb() {
  return {
    visitorEvent: {
      findMany: async (args: { where: { type: string } }) => {
        const { type } = args.where;
        if (type === 'visit_start') return [visit('s1', '2026-11-24T08:00:00Z', 30), visit('s1', '2026-11-25T08:00:00Z', 60), visit('s2', '2026-11-25T09:00:00Z', 20)];
        if (type === 'page_view') return [{ occurredAt: new Date('2026-11-24T08:00:00Z') }, { occurredAt: new Date('2026-11-25T08:00:00Z') }, { occurredAt: new Date('2026-11-25T08:01:00Z') }, { occurredAt: new Date('2026-11-25T09:00:00Z') }];
        return [{ sessionId: 's1' }];
      },
      count: async () => 4,
      groupBy: async () => [],
    },
    visitorSession: { findMany: async () => [session('2026-11-24T08:00:00Z'), session('2026-11-25T09:00:00Z')] },
  };
}

describe('getAnalyticsOverview : courbes des indicateurs', () => {
  it('trace visiteurs, visites, pages vues et durée moyenne jour par jour', async () => {
    const overview = await getAnalyticsOverview(2, NOW, fakeDb() as never);
    expect(overview.series.visits.map((point) => point.value)).toEqual([1, 2]);
    // s1 est venu deux jours de suite : un visiteur chaque jour ; s2 seulement le 25.
    expect(overview.series.visitors.map((point) => point.value)).toEqual([1, 2]);
    expect(overview.series.pageViews.map((point) => point.value)).toEqual([1, 3]);
    // 24 : 30 s ; 25 : (60 + 20) / 2 = 40 s.
    expect(overview.series.avgVisitSeconds.map((point) => point.value)).toEqual([30, 40]);
    expect(overview.series.visits.map((point) => point.day)).toEqual(['2026-11-24', '2026-11-25']);
  });

  it('les totaux des tuiles restent ceux de la période', async () => {
    const overview = await getAnalyticsOverview(2, NOW, fakeDb() as never);
    expect(overview.visits).toBe(3);
    expect(overview.pageViews).toBe(4);
    expect(overview.visitors).toBe(2);
    expect(overview.avgVisitSeconds).toBe(37);
  });
});
