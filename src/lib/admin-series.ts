// Séries de points pour les courbes des indicateurs (KPI) du back-office. Calculs PURS, testés sans base ni navigateur.
// Les jours sont des jours d'Abidjan (UTC+0 toute l'année) : la clé d'un jour est « 2026-11-25 ».
import { countByDay, dayKeys, periodStart } from '@/lib/analytics/aggregate';
import { netPaid, type PaymentLine } from '@/lib/shop/payments';

/** Un point de courbe. `null` = jour à venir : la courbe s'arrête là au lieu de retomber à zéro. */
export interface SeriesPoint {
  day: string;
  value: number | null;
}

/** Nombre de jours lus pour les courbes du tableau de bord (le sélecteur 7 / 30 jours découpe ensuite dans le navigateur). */
export const DASHBOARD_SERIES_DAYS = 30;

type DatedPayment = PaymentLine & { receivedAt: Date };

const DAY_MS = 24 * 60 * 60 * 1000;
const dayOf = (date: Date) => date.toISOString().slice(0, 10);

/** Les `days` derniers jours, aujourd'hui compris, du plus ancien au plus récent. */
export function lastDayKeys(now: Date, days: number): string[] {
  return dayKeys(periodStart(now, days), days);
}

/** Nombre d'éléments (commandes reçues, visites, pages vues…) par jour. */
export function countPerDay(dates: readonly Date[], keys: readonly string[]): SeriesPoint[] {
  return countByDay(dates, keys).map(({ day, count }) => ({ day, value: count }));
}

/** Encaissé net par jour (remboursements déduits, paiements annulés ignorés), d'après la date d'encaissement. */
export function collectedPerDay(payments: readonly DatedPayment[], keys: readonly string[]): SeriesPoint[] {
  const known = new Set(keys);
  const byDay = new Map<string, DatedPayment[]>();
  for (const payment of payments) {
    const key = dayOf(payment.receivedAt);
    if (known.has(key)) byDay.set(key, [...(byDay.get(key) ?? []), payment]);
  }
  return keys.map((day) => ({ day, value: netPaid(byDay.get(day) ?? []) }));
}

/**
 * Cumul de l'encaissé depuis le 1er du mois, jour après jour. Tous les jours du mois sont présents ; ceux qui suivent
 * `now` valent `null` (la courbe s'arrête à aujourd'hui).
 */
export function monthCumulative(payments: readonly DatedPayment[], now: Date): SeriesPoint[] {
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const length = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const keys = Array.from({ length }, (_, index) => dayOf(new Date(first.getTime() + index * DAY_MS)));
  const today = dayOf(now);
  let running = 0;
  return collectedPerDay(payments, keys).map((point) => {
    if (point.day > today) return { day: point.day, value: null };
    running += point.value ?? 0;
    return { day: point.day, value: running };
  });
}

/** Les `days` derniers points d'une série (tout si elle est plus courte). */
export function lastPoints(series: readonly SeriesPoint[], days: number): SeriesPoint[] {
  return series.length <= days ? [...series] : series.slice(series.length - days);
}

/** Somme des valeurs connues d'une série. */
export function seriesTotal(series: readonly SeriesPoint[]): number {
  return series.reduce((sum, point) => sum + (point.value ?? 0), 0);
}

/** Nombre d'identifiants DISTINCTS par jour (par exemple les visiteurs qui ont ouvert une visite ce jour-là). */
export function distinctPerDay(items: readonly { at: Date; id: string }[], keys: readonly string[]): SeriesPoint[] {
  const known = new Set(keys);
  const byDay = new Map<string, Set<string>>();
  for (const item of items) {
    const key = dayOf(item.at);
    if (!known.has(key)) continue;
    const ids = byDay.get(key) ?? new Set<string>();
    ids.add(item.id);
    byDay.set(key, ids);
  }
  return keys.map((day) => ({ day, value: byDay.get(day)?.size ?? 0 }));
}

/** Moyenne arrondie par jour ; un jour sans aucune valeur vaut 0 (pas de trou dans la courbe). */
export function averagePerDay(items: readonly { at: Date; value: number }[], keys: readonly string[]): SeriesPoint[] {
  const known = new Set(keys);
  const sums = new Map<string, { total: number; count: number }>();
  for (const item of items) {
    const key = dayOf(item.at);
    if (!known.has(key)) continue;
    const entry = sums.get(key) ?? { total: 0, count: 0 };
    entry.total += item.value;
    entry.count += 1;
    sums.set(key, entry);
  }
  return keys.map((day) => {
    const entry = sums.get(day);
    return { day, value: entry && entry.count > 0 ? Math.round(entry.total / entry.count) : 0 };
  });
}
