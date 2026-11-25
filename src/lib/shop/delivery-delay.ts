import type { ZoneTypeValue } from '@/lib/constants/order';

// Délais de livraison INDICATIFS (cahier D-26, RM-47, P-56). Un délai n'est jamais une garantie : tout texte qui
// l'affiche passe par ce module, qui ne produit que des formulations « indicatives », jamais une date précise.
//
// Les délais sont portés par chaque zone (`DeliveryZone.deliveryMinHours` / `deliveryMaxHours`). Une zone qui n'en
// a pas reprend celui de son TYPE : ce sont les trois délais fournis par la cliente (réponse C4), l'exception
// encadrée de RM-42 (« les délais indicatifs fournis par la cliente »).

export interface DelayRange {
  /** Heures, entier ≥ 1. */
  minHours: number;
  /** Heures, entier ≥ minHours. */
  maxHours: number;
}

/** Réponse C4 de la cliente (annexe D) : Abidjan 24 h · intérieur du pays 72 h · international 5 à 15 jours. */
export const DEFAULT_DELAYS: Record<ZoneTypeValue, DelayRange> = {
  ABIDJAN: { minHours: 24, maxHours: 24 },
  INTERIOR: { minHours: 72, maxHours: 72 },
  INTERNATIONAL: { minHours: 120, maxHours: 360 },
};

/** Au-delà de ce seuil (en heures), le délai s'exprime en jours (cahier P-56 : « jusqu'à 72 h en heures »). */
export const HOURS_DISPLAY_LIMIT = 72;
export const DELAY_MAX_HOURS = 24 * 120;

/** Phrase qui accompagne TOUT délai affiché. Le point de départ du délai n'est pas encore confirmé (question 27) : on ne l'invente pas. */
export const DELAY_DISCLAIMER = 'L’équipe vous confirme le délai exact sur WhatsApp.';

type MaybeHours = number | null | undefined;

const isHours = (value: MaybeHours): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1;

/**
 * Délai propre à une zone, ou null s'il n'en a pas. Une seule borne renseignée = délai fixe ; deux bornes inversées
 * sont remises dans l'ordre plutôt que d'afficher un texte absurde.
 */
export function zoneDelay(minHours: MaybeHours, maxHours: MaybeHours): DelayRange | null {
  const min = isHours(minHours) ? minHours : null;
  const max = isHours(maxHours) ? maxHours : null;
  if (min === null && max === null) return null;
  const a = min ?? (max as number);
  const b = max ?? (min as number);
  return { minHours: Math.min(a, b), maxHours: Math.max(a, b) };
}

/** Délai effectif d'une zone : le sien, sinon celui de son type. */
export function effectiveDelay(type: ZoneTypeValue, minHours: MaybeHours, maxHours: MaybeHours): DelayRange {
  return zoneDelay(minHours, maxHours) ?? DEFAULT_DELAYS[type];
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/**
 * « 24 h », « 72 h », « 5 à 15 jours », « 2 à 5 jours », « 7 jours ». En heures tant que la borne haute ne dépasse pas
 * 72 h, en jours au-delà (bornes arrondies au jour supérieur pour ne jamais annoncer plus court que prévu).
 */
export function formatDelay(range: DelayRange): string {
  const { minHours, maxHours } = range;
  if (maxHours <= HOURS_DISPLAY_LIMIT) {
    return minHours === maxHours ? `${maxHours} h` : `${minHours} à ${maxHours} h`;
  }
  const maxDays = Math.ceil(maxHours / 24);
  // Délai fixe : un seul nombre de jours, arrondi au jour supérieur. Fourchette : borne basse arrondie à l'inférieur.
  const minDays = minHours === maxHours ? maxDays : Math.max(1, Math.floor(minHours / 24));
  if (minDays >= maxDays) return `${maxDays} ${plural(maxDays, 'jour', 'jours')}`;
  return `${minDays} à ${maxDays} jours`;
}

/** Fusionne les délais de plusieurs zones d'un même type (résumé de la FAQ) : du plus court au plus long. */
export function mergeDelays(ranges: readonly DelayRange[]): DelayRange | null {
  if (ranges.length === 0) return null;
  return {
    minHours: Math.min(...ranges.map((range) => range.minHours)),
    maxHours: Math.max(...ranges.map((range) => range.maxHours)),
  };
}

/** Phrase d'une zone : « Délai indicatif : 24 h. ». Toujours qualifiée d'« indicatif » (RM-47). */
export function delaySentence(range: DelayRange): string {
  return `Délai indicatif : ${formatDelay(range)}.`;
}

/** Textes libres de la vendeuse (écran Livraison) qui accompagnent les délais. */
export interface DeliveryNotes {
  leadTimeNote: string | null;
  rules: string | null;
}

export const NO_DELIVERY_NOTES: DeliveryNotes = { leadTimeNote: null, rules: null };

/**
 * Lignes affichées sous le choix de destination et sur la confirmation : le délai indicatif, la précision de la
 * vendeuse (point de départ…) puis son texte sur la livraison. Jamais « garanti », jamais une date précise.
 */
export function deliveryNoticeLines(range: DelayRange, notes: DeliveryNotes = NO_DELIVERY_NOTES): string[] {
  return [`${delaySentence(range)} ${DELAY_DISCLAIMER}`, ...(notes.leadTimeNote ? [notes.leadTimeNote] : []), ...(notes.rules ? [notes.rules] : [])];
}

/** Réponse de la FAQ : « 24 h à Abidjan, 72 h à l'intérieur… ». Les délais viennent des zones, jamais d'un texte figé. */
export function faqDelayAnswer(summary: DelaySummary): string {
  return `Les délais sont indicatifs : ${formatDelay(summary.ABIDJAN)} à Abidjan, ${formatDelay(summary.INTERIOR)} à l’intérieur de la Côte d’Ivoire et ${formatDelay(summary.INTERNATIONAL)} à l’international. ${DELAY_DISCLAIMER}`;
}

/** Résumé par type de zone, pour les textes qui ne dépendent pas d'une zone choisie (FAQ, pied de page). */
export type DelaySummary = Record<ZoneTypeValue, DelayRange>;

export interface ZoneDelayRow {
  type: ZoneTypeValue;
  deliveryMinHours: number | null;
  deliveryMaxHours: number | null;
}

/**
 * Résumé par type à partir des zones ACTIVES : si un type a des zones, on fusionne leurs délais effectifs ; sinon on
 * garde le délai par défaut du type (destination saisie librement).
 */
export function summarizeDelays(zones: readonly ZoneDelayRow[]): DelaySummary {
  const summary: DelaySummary = { ...DEFAULT_DELAYS };
  for (const type of Object.keys(DEFAULT_DELAYS) as ZoneTypeValue[]) {
    const ofType = zones.filter((zone) => zone.type === type).map((zone) => effectiveDelay(type, zone.deliveryMinHours, zone.deliveryMaxHours));
    const merged = mergeDelays(ofType);
    if (merged) summary[type] = merged;
  }
  return summary;
}
