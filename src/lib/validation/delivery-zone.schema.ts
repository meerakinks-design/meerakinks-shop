import { z } from 'zod';
import { ZONE_TYPES } from '@/lib/constants/order';
import { DELAY_MAX_HOURS } from '@/lib/shop/delivery-delay';

// Zones de livraison modifiables par la vendeuse (cahier §7.3 « Livraison », RM-03, RM-47, P-56).
// Frais vide = « à confirmer » (jamais inventé) ; délai vide = délai par défaut du type de zone.

const emptyToNull = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? null : value);

const optionalInt = (label: string, max: number, min = 0) =>
  z.preprocess(
    emptyToNull,
    z
      .number({ invalid_type_error: `${label} : saisissez un nombre entier.` })
      .int(`${label} : saisissez un nombre entier.`)
      .min(min, `${label} : la valeur minimale est ${min}.`)
      .max(max, `${label} : la valeur maximale est ${max}.`)
      .nullish()
      .transform((value) => value ?? null),
  );

export const deliveryZoneInputSchema = z
  .object({
    name: z.string({ required_error: 'Donnez un nom à la zone.' }).trim().min(2, 'Le nom est trop court.').max(80, 'Le nom est trop long.'),
    type: z.enum(ZONE_TYPES, { errorMap: () => ({ message: 'Choisissez un type de zone.' }) }),
    /** FCFA entiers ; null = « frais à confirmer ». */
    fee: optionalInt('Frais', 10_000_000),
    deliveryMinHours: optionalInt('Délai minimal', DELAY_MAX_HOURS, 1),
    deliveryMaxHours: optionalInt('Délai maximal', DELAY_MAX_HOURS, 1),
    isActive: z.boolean().default(true),
    position: z.number().int().min(0).max(1000).default(0),
  })
  .superRefine((zone, context) => {
    if (zone.deliveryMinHours !== null && zone.deliveryMaxHours !== null && zone.deliveryMinHours > zone.deliveryMaxHours) {
      context.addIssue({ code: 'custom', path: ['deliveryMaxHours'], message: 'Le délai maximal doit être supérieur ou égal au délai minimal.' });
    }
  });

export type DeliveryZoneFormInput = z.input<typeof deliveryZoneInputSchema>;
export type DeliveryZoneData = z.output<typeof deliveryZoneInputSchema>;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} trop long (${max} caractères maximum).`)
    .nullish()
    .transform((value) => (value ? value : null));

/** Textes libres de la vendeuse, affichés avec les délais (précision sur le point de départ, règles de livraison). */
export const deliveryNotesSchema = z.object({
  deliveryLeadTimeNote: optionalText(400, 'La précision sur les délais'),
  deliveryRules: optionalText(1200, 'Le texte sur la livraison'),
});

export type DeliveryNotesFormInput = z.input<typeof deliveryNotesSchema>;
export type DeliveryNotesData = z.output<typeof deliveryNotesSchema>;
