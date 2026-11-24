// Téléphone international : sert de WhatsApp et d'identifiant client (RM-15). Format stocké : +<indicatif><numéro>.

export interface DialCode {
  code: string;
  label: string;
}

export const DEFAULT_DIAL_CODE = '225';
/** Nombre maximal de chiffres d'un indicatif pays (ex. « 1 242 » = 4 chiffres). */
export const MAX_DIAL_CODE_LENGTH = 4;

export const DIAL_CODES: readonly DialCode[] = [
  { code: '225', label: 'Côte d’Ivoire (+225)' },
  { code: '226', label: 'Burkina Faso (+226)' },
  { code: '223', label: 'Mali (+223)' },
  { code: '221', label: 'Sénégal (+221)' },
  { code: '224', label: 'Guinée (+224)' },
  { code: '227', label: 'Niger (+227)' },
  { code: '228', label: 'Togo (+228)' },
  { code: '229', label: 'Bénin (+229)' },
  { code: '233', label: 'Ghana (+233)' },
  { code: '234', label: 'Nigeria (+234)' },
  { code: '231', label: 'Liberia (+231)' },
  { code: '237', label: 'Cameroun (+237)' },
  { code: '241', label: 'Gabon (+241)' },
  { code: '242', label: 'Congo (+242)' },
  { code: '243', label: 'RD Congo (+243)' },
  { code: '212', label: 'Maroc (+212)' },
  { code: '216', label: 'Tunisie (+216)' },
  { code: '213', label: 'Algérie (+213)' },
  { code: '33', label: 'France (+33)' },
  { code: '32', label: 'Belgique (+32)' },
  { code: '41', label: 'Suisse (+41)' },
  { code: '49', label: 'Allemagne (+49)' },
  { code: '39', label: 'Italie (+39)' },
  { code: '34', label: 'Espagne (+34)' },
  { code: '44', label: 'Royaume-Uni (+44)' },
  { code: '1', label: 'Canada, États-Unis (+1)' },
];

/**
 * L'indicatif est TAPÉ librement par le client (pas de liste fermée) : on ne garde que les chiffres, « + » et espaces
 * collés par le navigateur ou par le client disparaissent.
 */
export function sanitizeDialCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, MAX_DIAL_CODE_LENGTH);
}

/** Nom du pays quand l'indicatif est connu (« 225 » → « Côte d’Ivoire »), sinon null : un indicatif inconnu reste accepté. */
export function dialCountryName(dialCode: string): string | null {
  const known = DIAL_CODES.find((dial) => dial.code === sanitizeDialCode(dialCode));
  return known ? known.label.replace(/\s*\(\+\d+\)$/, '') : null;
}

const IVORY_COAST_CODE = '225';
/** Depuis le 31 janvier 2021, un numéro ivoirien compte 10 chiffres ; le 0 initial FAIT PARTIE du numéro. */
const IVORY_COAST_NATIONAL_LENGTH = 10;
const MIN_TOTAL_DIGITS = 8;
const MAX_TOTAL_DIGITS = 15; // limite E.164

export type PhoneResult = { ok: true; e164: string } | { ok: false; message: string };

const digitsOf = (value: string): string => value.replace(/\D/g, '');
const invalid = (message: string): PhoneResult => ({ ok: false, message });

/**
 * Normalise un numéro saisi en `+<chiffres>`.
 *  - Saisi avec « + » ou « 00 » : le numéro est déjà international, l'indicatif du sélecteur est ignoré.
 *  - Sinon : indicatif du sélecteur + numéro national. Hors Côte d'Ivoire, un seul « 0 » de tête
 *    (préfixe national, ex. 06… en France) est retiré.
 */
export function normalizePhone(dialCodeInput: string, numberInput: string): PhoneResult {
  const typed = numberInput.trim();
  if (!typed) return invalid('Indiquez votre numéro de téléphone.');

  let full: string;
  if (typed.startsWith('+')) {
    full = digitsOf(typed);
  } else if (typed.startsWith('00')) {
    full = digitsOf(typed).slice(2);
  } else {
    const dial = digitsOf(dialCodeInput);
    if (!/^[1-9]\d{0,3}$/.test(dial)) return invalid('Indiquez l’indicatif du pays (ex. 225).');
    const national = dial === IVORY_COAST_CODE ? digitsOf(typed) : digitsOf(typed).replace(/^0/, '');
    full = `${dial}${national}`;
  }

  if (full.startsWith(IVORY_COAST_CODE) && full.length - IVORY_COAST_CODE.length !== IVORY_COAST_NATIONAL_LENGTH) {
    return invalid('Un numéro ivoirien compte 10 chiffres (ex. 07 00 00 00 00).');
  }
  if (full.length < MIN_TOTAL_DIGITS || full.length > MAX_TOTAL_DIGITS || full.startsWith('0')) {
    return invalid('Ce numéro de téléphone n’est pas valide.');
  }
  return { ok: true, e164: `+${full}` };
}

/** +2250700000000 → « +225 07 00 00 00 00 » ; les autres pays : « +<chiffres> ». */
export function formatPhoneDisplay(e164: string): string {
  const digits = digitsOf(e164);
  if (digits.startsWith(IVORY_COAST_CODE) && digits.length === IVORY_COAST_CODE.length + IVORY_COAST_NATIONAL_LENGTH) {
    return `+${IVORY_COAST_CODE} ${digits.slice(IVORY_COAST_CODE.length).replace(/(\d{2})(?=\d)/g, '$1 ')}`;
  }
  return `+${digits}`;
}
