import { ZONE_TYPES, type ZoneTypeValue } from '@/lib/constants/order';

/** Zone desservie telle que le formulaire la voit (jamais le numéro Wave ni d'information interne). */
export interface PublicZone {
  id: string;
  name: string;
  /** null = frais à confirmer. */
  fee: number | null;
}

export type PublicZones = Record<ZoneTypeValue, PublicZone[]>;

export const emptyZones = (): PublicZones => Object.fromEntries(ZONE_TYPES.map((type) => [type, []])) as unknown as PublicZones;
