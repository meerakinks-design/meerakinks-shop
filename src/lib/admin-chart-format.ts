// Mise en forme des valeurs et des jours des courbes du back-office (pur : testable, utilisable côté serveur et navigateur).
import { formatDuration } from '@/lib/analytics/classify';
import { formatFcfa } from '@/lib/money';

/** Ce que mesure une courbe : un nombre, des FCFA ou des secondes. */
export type SeriesUnit = 'count' | 'fcfa' | 'seconds';

const NUMBER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
/** Une décimale au plus, pour les graduations abrégées (« 12,5 k »). */
const NUMBER_ONE_DECIMAL = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** Valeur lisible. `compact` : graduations de l'axe (« 12 k », « 45 s ») ; sinon valeur complète pour la bulle et les résumés. */
export function formatSeriesValue(value: number, unit: SeriesUnit, compact = false): string {
  if (unit === 'fcfa') {
    if (!compact) return formatFcfa(value);
    if (Math.abs(value) >= 1_000_000) return `${NUMBER_ONE_DECIMAL.format(Math.round(value / 100_000) / 10)} M`;
    if (Math.abs(value) >= 1000) return `${NUMBER_ONE_DECIMAL.format(Math.round(value / 100) / 10)} k`;
    return NUMBER.format(value);
  }
  if (unit === 'seconds') return formatDuration(value);
  return NUMBER.format(value);
}

/** « 2026-11-25 » → « 25 nov. » (avec `long` : « mer. 25 nov. 2026 »). Les jours sont des jours UTC (Abidjan). */
export function formatShortDay(day: string, long = false): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat('fr-FR', long ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
}
