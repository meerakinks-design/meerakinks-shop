import { randomInt } from 'node:crypto';

// Alphabet de Crockford sans I, L, O, U : 32 symboles, pas de confusion à l'oral ni sur WhatsApp.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 8;
const ORDER_PREFIX = 'CMD-';
const RECEIPT_PREFIX = 'REC-';

/** Code aléatoire non séquentiel (crypto.randomInt est sans biais). */
export function randomCode(length: number = CODE_LENGTH): string {
  let code = '';
  for (let index = 0; index < length; index += 1) code += ALPHABET.charAt(randomInt(ALPHABET.length));
  return code;
}

/** RM-13 : référence unique et non devinable. Une référence devinable permettrait de lire les commandes des autres. */
export const generateOrderReference = (): string => `${ORDER_PREFIX}${randomCode()}`;

/** RM-24 : le numéro de reçu dérive de la référence (CMD-7K3M9QXP → REC-7K3M9QXP), donc lui aussi non séquentiel. */
export const receiptNumberFor = (reference: string): string => `${RECEIPT_PREFIX}${reference.slice(ORDER_PREFIX.length)}`;
