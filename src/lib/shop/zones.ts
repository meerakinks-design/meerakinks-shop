import { ZONE_TYPES, type ZoneTypeValue } from '@/lib/constants/order';
import { delaySentence, effectiveDelay, formatDelay, type DelayRange } from '@/lib/shop/delivery-delay';

/** Zone desservie telle que le formulaire la voit (jamais le numéro Wave ni d'information interne). */
export interface PublicZone {
  id: string;
  name: string;
  /** null = frais à confirmer. */
  fee: number | null;
  /** Délai propre à la zone (heures), null = celui de son type (RM-47). */
  deliveryMinHours: number | null;
  deliveryMaxHours: number | null;
}

export type PublicZones = Record<ZoneTypeValue, PublicZone[]>;

export const emptyZones = (): PublicZones => Object.fromEntries(ZONE_TYPES.map((type) => [type, []])) as unknown as PublicZones;

/** Délai à annoncer pour une destination : celui de la zone choisie, sinon celui de son type. */
export function delayForDestination(type: ZoneTypeValue, zone: Pick<PublicZone, 'deliveryMinHours' | 'deliveryMaxHours'> | null): DelayRange {
  return effectiveDelay(type, zone?.deliveryMinHours, zone?.deliveryMaxHours);
}

export const delayLabelForDestination = (type: ZoneTypeValue, zone: Parameters<typeof delayForDestination>[1]) => formatDelay(delayForDestination(type, zone));
export const delaySentenceForDestination = (type: ZoneTypeValue, zone: Parameters<typeof delayForDestination>[1]) => delaySentence(delayForDestination(type, zone));
