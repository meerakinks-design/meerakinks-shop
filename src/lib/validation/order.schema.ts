import { z } from 'zod';
import { IDEMPOTENCY_KEY_PATTERN, ORDER_LIMITS, ZONE_TYPES, type ZoneTypeValue } from '@/lib/constants/order';
import { MAX_CART_LINES } from '@/lib/shop/cart';
import { DEFAULT_DIAL_CODE, normalizePhone } from '@/lib/shop/phone';
import { cartItemSchema } from '@/lib/validation/cart.schema';

// Schéma de la commande : le MÊME code valide le formulaire (confort) et le serveur (vérité).
// Il n'accepte aucun prix : les clés inconnues (un « price » envoyé à la main, par exemple) sont ignorées,
// et le serveur relit tous les prix en base (D-10, RM-02).

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const CONTROL_CHARACTERS_EXCEPT_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f]/;
const FORBIDDEN_CHARACTERS = 'Certains caractères ne sont pas autorisés.';
const tooLong = (max: number) => `Maximum ${max} caractères.`;
const CONFIRM_MESSAGE = 'Cochez la case pour confirmer votre commande.';
const emptyToUndefined = (value: string | undefined) => (value ? value : undefined);

/** Texte obligatoire sur une seule ligne. */
const requiredLine = (min: number, max: number, requiredMessage: string, tooShortMessage = requiredMessage) =>
  z
    .string({ required_error: requiredMessage, invalid_type_error: requiredMessage })
    .trim()
    .min(1, requiredMessage)
    .min(min, tooShortMessage)
    .max(max, tooLong(max))
    .refine((value) => !CONTROL_CHARACTERS.test(value), FORBIDDEN_CHARACTERS);

/** Texte facultatif sur une seule ligne : une chaîne vide devient « absent ». */
const optionalLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max, tooLong(max))
    .refine((value) => !CONTROL_CHARACTERS.test(value), FORBIDDEN_CHARACTERS)
    .optional()
    .transform(emptyToUndefined);

/** Texte facultatif sur plusieurs lignes (note du client). */
const optionalParagraph = (max: number) =>
  z
    .string()
    .transform((value) => value.replace(/\r\n?/g, '\n').trim())
    .refine((value) => value.length <= max, tooLong(max))
    .refine((value) => !CONTROL_CHARACTERS_EXCEPT_NEWLINE.test(value), FORBIDDEN_CHARACTERS)
    .optional()
    .transform(emptyToUndefined);

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(ORDER_LIMITS.email, tooLong(ORDER_LIMITS.email))
  .optional()
  .transform(emptyToUndefined)
  .pipe(z.string().email('Adresse email invalide.').optional());

const PLACE_REQUIRED_MESSAGES: Record<ZoneTypeValue, string> = {
  ABIDJAN: 'Indiquez votre commune.',
  INTERIOR: 'Indiquez votre ville.',
  INTERNATIONAL: 'Indiquez votre pays.',
};

const baseOrderSchema = z.object({
  idempotencyKey: z.string({ required_error: 'Clé de commande manquante.' }).regex(IDEMPOTENCY_KEY_PATTERN, 'Clé de commande invalide.'),
  items: z.array(cartItemSchema).min(1, 'Votre panier est vide.').max(MAX_CART_LINES),

  /** « Nom complet » : nom et prénom dans un seul champ. */
  fullName: requiredLine(2, ORDER_LIMITS.fullName, 'Indiquez votre nom et prénom.', 'Votre nom doit compter au moins 2 caractères.'),
  phoneDialCode: z.string().trim().max(8).default(DEFAULT_DIAL_CODE),
  phone: z
    .string({ required_error: 'Indiquez votre numéro de téléphone.', invalid_type_error: 'Indiquez votre numéro de téléphone.' })
    .trim()
    .min(1, 'Indiquez votre numéro de téléphone.')
    .max(ORDER_LIMITS.phone, 'Ce numéro de téléphone est trop long.'),
  email: optionalEmail,

  zoneType: z.enum(ZONE_TYPES, { errorMap: () => ({ message: 'Choisissez une zone de livraison.' }) }),
  /** Destination choisie dans la liste des zones desservies. */
  deliveryZoneId: optionalLine(64),
  /** Destination saisie à la main (commune, ville ou pays) quand aucune liste n'existe pour cette zone. */
  placeName: optionalLine(ORDER_LIMITS.place),
  /** Ville, pour une commande hors du pays (le pays est la destination). */
  city: optionalLine(ORDER_LIMITS.place),
  address: requiredLine(5, ORDER_LIMITS.address, 'Indiquez votre adresse de livraison.', 'Précisez votre adresse (quartier, rue, repère).'),
  addressDetails: optionalLine(ORDER_LIMITS.addressDetails),
  customerNote: optionalParagraph(ORDER_LIMITS.note),

  /** Case « J'ai vérifié les informations de ma commande » : obligatoire, contrôlée aussi par le serveur. */
  infoConfirmed: z.boolean({ required_error: CONFIRM_MESSAGE, invalid_type_error: CONFIRM_MESSAGE }).refine((value) => value === true, CONFIRM_MESSAGE),

  /** Champ piège (honeypot) : invisible pour un humain, rempli par les robots. */
  companyFax: z.string().max(200).optional(),
});

export const orderInputSchema = baseOrderSchema
  .superRefine((value, context) => {
    const seen = new Set<string>();
    for (const item of value.items) {
      const lineKey = `${item.productId}:${item.variantId ?? ''}`;
      if (seen.has(lineKey)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'Un produit apparaît deux fois dans la commande.' });
        break;
      }
      seen.add(lineKey);
    }
    if (!value.deliveryZoneId && !value.placeName) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['placeName'], message: PLACE_REQUIRED_MESSAGES[value.zoneType] });
    }
    if (value.zoneType === 'INTERNATIONAL' && !value.city) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['city'], message: 'Indiquez votre ville.' });
    }
    // Vérifié ici (et non seulement dans la transformation) pour que TOUTES les erreurs sortent en une seule fois :
    // une transformation ne s'exécute que si le reste du formulaire est déjà valide.
    const phone = normalizePhone(value.phoneDialCode, value.phone);
    if (!phone.ok && value.phone.length > 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: phone.message });
    }
  })
  .transform((value, context) => {
    const phone = normalizePhone(value.phoneDialCode, value.phone);
    if (!phone.ok) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: phone.message });
      return z.NEVER;
    }
    return { ...value, phoneE164: phone.e164 };
  });

/** Ce que le serveur reçoit après validation (téléphone normalisé, champs vides retirés). */
export type OrderInput = z.output<typeof orderInputSchema>;
/** Ce que le navigateur envoie. */
export type OrderPayload = z.input<typeof orderInputSchema>;
