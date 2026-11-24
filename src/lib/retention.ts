import {
  ANONYMIZED_ADDRESS,
  ANONYMIZED_FULL_NAME,
  anonymizedPhone,
} from '@/lib/constants/retention';

// Fonctions pures de la conservation des données (testées sans base).

/**
 * Date limite : un client dont la dernière commande est plus ancienne que `months` mois peut être anonymisé.
 * Calcul en UTC ; le jour est ramené à la fin du mois visé (31 mars − 1 mois = 28 février, jamais « 3 mars »).
 */
export function retentionCutoff(now: Date, months: number): Date {
  const totalMonths = now.getUTCFullYear() * 12 + now.getUTCMonth() - months;
  const year = Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(now.getUTCDate(), lastDayOfTargetMonth),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    ),
  );
}

/** Champs d'une fiche client une fois anonymisée. */
export function anonymizedCustomerFields(customerId: string, now: Date) {
  return {
    fullName: ANONYMIZED_FULL_NAME,
    phone: anonymizedPhone(customerId),
    email: null,
    anonymizedAt: now,
  };
}

/**
 * Reçu figé (colonne JSON) après anonymisation : le client et l'adresse sont remplacés ; les montants, les lignes et les
 * dates restent (le reçu garde sa valeur de pièce justificative sans identifier personne). Une valeur qui n'est pas un
 * objet est illisible : on renvoie `null` plutôt que de la laisser avec d'éventuelles données personnelles, et l'appelant
 * la traite comme une erreur.
 */
export function anonymizeReceiptData(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const receipt = value as Record<string, unknown>;
  const delivery = typeof receipt.delivery === 'object' && receipt.delivery !== null && !Array.isArray(receipt.delivery) ? (receipt.delivery as Record<string, unknown>) : {};
  return {
    ...receipt,
    customer: { fullName: ANONYMIZED_FULL_NAME, phone: '', email: null },
    delivery: { ...delivery, address: ANONYMIZED_ADDRESS },
  };
}
