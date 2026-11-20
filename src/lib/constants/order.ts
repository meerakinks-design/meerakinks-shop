// Constantes de la commande : une seule source pour les types de zone, les limites de saisie et les formats.
// Les valeurs de ZONE_TYPES sont celles de l'enum Prisma ZoneType (un test le vérifie).

export const ZONE_TYPES = ['ABIDJAN', 'INTERIOR', 'INTERNATIONAL'] as const;
export type ZoneTypeValue = (typeof ZONE_TYPES)[number];

export const ZONE_TYPE_LABELS: Record<ZoneTypeValue, string> = {
  ABIDJAN: 'Une commune d’Abidjan',
  INTERIOR: 'Une autre ville de Côte d’Ivoire',
  INTERNATIONAL: 'Un autre pays',
};

/** Libellé du champ de destination selon la zone. */
export const PLACE_LABELS: Record<ZoneTypeValue, string> = {
  ABIDJAN: 'Commune',
  INTERIOR: 'Ville',
  INTERNATIONAL: 'Pays',
};

export const HOME_COUNTRY = 'Côte d’Ivoire';

export const ORDER_LIMITS = {
  name: 60,
  email: 120,
  place: 80,
  phone: 30,
  address: 300,
  addressDetails: 200,
  note: 500,
} as const;

/** Clé d'idempotence : 16 à 80 caractères sûrs (un UUID passe). */
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,80}$/;

/**
 * Référence publique : « CMD- » + 8 caractères de l'alphabet de Crockford (sans I, L, O, U : pas de
 * confusion à l'oral ni dans un message WhatsApp). 32^8 ≈ 1,1 × 10^12 : non devinable.
 */
export const ORDER_REFERENCE_PATTERN = /^CMD-[0-9A-HJKMNP-TV-Z]{8}$/;

/**
 * Limites anti-abus. Le plafond par IP est volontairement large : sur les réseaux mobiles, beaucoup
 * de clients partagent la même adresse publique, et on ne doit pas bloquer un vrai client.
 */
export const ORDER_RATE_LIMITS = {
  perIp: { limit: 10, windowSeconds: 600 },
  perPhone: { limit: 5, windowSeconds: 3600 },
  confirmationPerIp: { limit: 30, windowSeconds: 600 },
} as const;
