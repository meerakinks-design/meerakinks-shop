// Calculs PURS de l'onglet Analytics (testés sans base). Les jours sont des jours d'Abidjan (UTC+0 toute l'année).

export const PERIOD_CHOICES = [7, 30, 90] as const;
export type PeriodDays = (typeof PERIOD_CHOICES)[number];
export const DEFAULT_PERIOD: PeriodDays = 30;

/** « ?jours=30 » → une période permise ; toute autre valeur retombe sur 30 jours. */
export function parsePeriod(value: string | string[] | undefined): PeriodDays {
  const raw = Array.isArray(value) ? value[0] : value;
  const days = Number(raw);
  return (PERIOD_CHOICES as readonly number[]).includes(days) ? (days as PeriodDays) : DEFAULT_PERIOD;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Minuit (heure d'Abidjan) du premier jour d'une période de `days` jours qui se termine aujourd'hui, jour courant inclus. */
export function periodStart(now: Date, days: number): Date {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(today - (days - 1) * DAY_MS);
}

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/** Les `days` jours de la période, du plus ancien au plus récent (« 2026-11-23 »). */
export function dayKeys(start: Date, days: number): string[] {
  return Array.from({ length: days }, (_, index) => dayKey(new Date(start.getTime() + index * DAY_MS)));
}

/** Nombre d'éléments par jour de la période (les dates hors période sont ignorées). */
export function countByDay(dates: readonly Date[], keys: readonly string[]): { day: string; count: number }[] {
  const counts = new Map(keys.map((key) => [key, 0]));
  for (const date of dates) {
    const key = dayKey(date);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return keys.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}

export interface Counted {
  label: string;
  count: number;
}

/** Décompte par valeur, du plus fréquent au moins fréquent ; les valeurs vides deviennent `fallback` ; `limit` lignes au plus. */
export function tally(values: readonly (string | null | undefined)[], options: { fallback?: string; limit?: number } = {}): Counted[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value && value.trim() ? value : options.fallback;
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const rows = [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'));
  return options.limit ? rows.slice(0, options.limit) : rows;
}

/** Moyenne arrondie, ou null s'il n'y a rien à moyenner. */
export function average(values: readonly number[]): number | null {
  return values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Part de `part` dans `whole`, en pour cent entier ; null si `whole` est nul (jamais de division par zéro). */
export function percent(part: number, whole: number): number | null {
  return whole <= 0 ? null : Math.round((part / whole) * 100);
}

export interface FunnelStep {
  key: string;
  label: string;
  visitors: number;
  /** Part des visiteurs de l'étape précédente. */
  fromPrevious: number | null;
}

/** Entonnoir : chaque étape est comparée à la précédente. */
export function buildFunnel(steps: readonly { key: string; label: string; visitors: number }[]): FunnelStep[] {
  return steps.map((step, index) => ({ ...step, fromPrevious: index === 0 ? null : percent(step.visitors, steps[index - 1]?.visitors ?? 0) }));
}
