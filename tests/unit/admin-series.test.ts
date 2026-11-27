import { describe, expect, it } from 'vitest';
import { formatSeriesValue, formatShortDay } from '@/lib/admin-chart-format';
import { averagePerDay, collectedPerDay, countPerDay, distinctPerDay, lastDayKeys, lastPoints, monthCumulative, seriesTotal } from '@/lib/admin-series';

const NOW = new Date('2026-11-25T15:00:00Z');
const payment = (kind: 'DEPOSIT' | 'BALANCE' | 'FULL' | 'REFUND', amount: number, receivedAt: string, voided = false) => ({ kind, amount, receivedAt: new Date(receivedAt), voidedAt: voided ? new Date('2026-11-25T16:00:00Z') : null });

describe('courbes des indicateurs : séries par jour', () => {
  it('lastDayKeys : les derniers jours, aujourd’hui compris, du plus ancien au plus récent', () => {
    expect(lastDayKeys(NOW, 3)).toEqual(['2026-11-23', '2026-11-24', '2026-11-25']);
  });

  it('countPerDay : compte par jour et ignore les dates hors période', () => {
    const keys = lastDayKeys(NOW, 3);
    const dates = [new Date('2026-11-24T08:00:00Z'), new Date('2026-11-24T20:00:00Z'), new Date('2026-11-25T00:00:00Z'), new Date('2026-11-01T10:00:00Z')];
    expect(countPerDay(dates, keys)).toEqual([
      { day: '2026-11-23', value: 0 },
      { day: '2026-11-24', value: 2 },
      { day: '2026-11-25', value: 1 },
    ]);
  });

  it('collectedPerDay : encaissé net par jour (remboursement déduit, paiement annulé ignoré, autres jours ignorés)', () => {
    const keys = lastDayKeys(NOW, 3);
    const series = collectedPerDay(
      [payment('DEPOSIT', 2000, '2026-11-24T09:00:00Z'), payment('FULL', 5000, '2026-11-25T09:00:00Z'), payment('REFUND', 1000, '2026-11-25T11:00:00Z'), payment('FULL', 3000, '2026-11-25T12:00:00Z', true), payment('FULL', 9000, '2026-11-01T12:00:00Z')],
      keys,
    );
    expect(series.map((point) => point.value)).toEqual([0, 2000, 4000]);
  });

  it('monthCumulative : cumul depuis le 1er, tous les jours du mois, les jours à venir valent null', () => {
    const series = monthCumulative([payment('FULL', 5000, '2026-11-10T09:00:00Z'), payment('DEPOSIT', 2000, '2026-11-22T09:00:00Z'), payment('FULL', 8000, '2026-10-31T23:00:00Z')], NOW);
    expect(series).toHaveLength(30);
    expect(series[0]).toEqual({ day: '2026-11-01', value: 0 });
    expect(series[9]?.value).toBe(5000); // 10 novembre
    expect(series[21]?.value).toBe(7000); // 22 novembre
    expect(series[24]).toEqual({ day: '2026-11-25', value: 7000 }); // aujourd’hui
    expect(series[25]).toEqual({ day: '2026-11-26', value: null });
    expect(series[29]?.value).toBeNull();
  });

  it('monthCumulative : le 1er du mois, un seul point connu', () => {
    const series = monthCumulative([payment('FULL', 1500, '2026-12-01T08:00:00Z')], new Date('2026-12-01T09:00:00Z'));
    expect(series).toHaveLength(31);
    expect(series[0]?.value).toBe(1500);
    expect(series[1]?.value).toBeNull();
  });

  it('lastPoints et seriesTotal', () => {
    const series = lastDayKeys(NOW, 5).map((day, index) => ({ day, value: index + 1 }));
    expect(lastPoints(series, 2).map((point) => point.value)).toEqual([4, 5]);
    expect(lastPoints(series, 50)).toHaveLength(5);
    expect(seriesTotal([...series, { day: '2026-11-26', value: null }])).toBe(15);
  });

  it('distinctPerDay : un visiteur n’est compté qu’une fois par jour', () => {
    const keys = lastDayKeys(NOW, 2);
    const series = distinctPerDay(
      [
        { at: new Date('2026-11-24T08:00:00Z'), id: 'a' },
        { at: new Date('2026-11-24T09:00:00Z'), id: 'a' },
        { at: new Date('2026-11-24T10:00:00Z'), id: 'b' },
        { at: new Date('2026-11-25T10:00:00Z'), id: 'a' },
        { at: new Date('2026-10-25T10:00:00Z'), id: 'z' },
      ],
      keys,
    );
    expect(series.map((point) => point.value)).toEqual([2, 1]);
  });

  it('averagePerDay : moyenne arrondie par jour, 0 pour un jour sans valeur', () => {
    const keys = lastDayKeys(NOW, 2);
    const series = averagePerDay(
      [
        { at: new Date('2026-11-25T08:00:00Z'), value: 10 },
        { at: new Date('2026-11-25T09:00:00Z'), value: 25 },
      ],
      keys,
    );
    expect(series.map((point) => point.value)).toEqual([0, 18]);
  });
});

describe('courbes des indicateurs : mise en forme', () => {
  const plain = (text: string) => text.replace(/[\u202f\u00a0]/g, ' ');

  it('valeurs complètes et compactes', () => {
    expect(plain(formatSeriesValue(1200, 'count'))).toBe('1 200');
    expect(plain(formatSeriesValue(12500, 'fcfa'))).toBe('12 500 FCFA');
    expect(plain(formatSeriesValue(12500, 'fcfa', true))).toBe('12,5 k');
    expect(plain(formatSeriesValue(2_500_000, 'fcfa', true))).toBe('2,5 M');
    expect(plain(formatSeriesValue(800, 'fcfa', true))).toBe('800');
    expect(formatSeriesValue(75, 'seconds')).toBe('1 min 15 s');
  });

  it('jours en français', () => {
    expect(formatShortDay('2026-11-25')).toContain('25');
    expect(formatShortDay('2026-11-25')).toContain('nov');
    expect(formatShortDay('2026-11-25', true)).toContain('2026');
    expect(formatShortDay('pas-une-date')).toBe('pas-une-date');
  });
});
