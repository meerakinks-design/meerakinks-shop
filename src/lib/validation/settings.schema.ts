import { z } from 'zod';
import { toWhatsappDigits } from '@/lib/shop/whatsapp';

// Paramètres de la boutique modifiables par la propriétaire (cahier §7.3 « Paramètres »). Un champ facultatif laissé vide
// devient « non renseigné » : la vitrine n'affiche alors rien à cet endroit (jamais une valeur inventée).

const emptyToNull = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? null : value);

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} : ${max} caractères au maximum.`)
    .nullish()
    .transform((value) => (value ? value : null));

const optionalEmail = (label: string) =>
  z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(160, `${label} : trop long.`)
      .email(`${label} : adresse email invalide.`)
      .nullish()
      .transform((value) => (value ? value.toLowerCase() : null)),
  );

/** Lien de réseau social : https obligatoire (jamais un lien en clair, jamais « javascript: »). */
const optionalHttpsUrl = (label: string) =>
  z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(300, `${label} : lien trop long.`)
      .url(`${label} : lien invalide (exemple : https://www.instagram.com/votre-compte).`)
      .refine((value) => /^https:\/\//i.test(value), `${label} : le lien doit commencer par https://.`)
      .nullish()
      .transform((value) => (value ? value : null)),
  );

/** Acompte demandé à Abidjan, en FCFA entiers. */
export const DEPOSIT_MIN = 500;
export const DEPOSIT_MAX = 500_000;

export const storeSettingsSchema = z.object({
  storeName: z.string({ required_error: 'Indiquez le nom de la boutique.' }).trim().min(2, 'Le nom de la boutique est trop court.').max(80, 'Le nom de la boutique est trop long.'),
  contactEmail: optionalEmail('Email de contact'),
  contactPhone: optionalText(30, 'Téléphone de contact'),
  legalName: optionalText(120, 'Nom légal'),
  address: optionalText(240, 'Adresse'),
  sellerWhatsApp: z
    .string({ required_error: 'Indiquez le numéro WhatsApp de la boutique.' })
    .trim()
    .max(30, 'Numéro WhatsApp trop long.')
    .refine((value) => toWhatsappDigits(value) !== null, 'Numéro WhatsApp invalide : indiquez-le avec l’indicatif du pays (exemple : +225 07 00 00 00 00).'),
  notificationEmail: z
    .string({ required_error: 'Indiquez l’email qui reçoit les alertes de commande.' })
    .trim()
    .max(160, 'Email trop long.')
    .email('Email d’alerte : adresse email invalide.')
    .transform((value) => value.toLowerCase()),
  waveNumber: optionalText(30, 'Numéro Wave'),
  depositAmount: z
    .number({ required_error: 'Indiquez le montant de l’acompte.', invalid_type_error: 'Acompte : saisissez un nombre entier.' })
    .int('Acompte : saisissez un nombre entier.')
    .min(DEPOSIT_MIN, `Acompte : au moins ${DEPOSIT_MIN} FCFA.`)
    .max(DEPOSIT_MAX, `Acompte : au plus ${DEPOSIT_MAX} FCFA.`),
  paymentRules: optionalText(1200, 'Le texte sur le paiement'),
  instagramUrl: optionalHttpsUrl('Instagram'),
  tiktokUrl: optionalHttpsUrl('TikTok'),
  facebookUrl: optionalHttpsUrl('Facebook'),
});

export type StoreSettingsFormInput = z.input<typeof storeSettingsSchema>;
export type StoreSettingsData = z.output<typeof storeSettingsSchema>;
