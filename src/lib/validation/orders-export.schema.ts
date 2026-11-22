import { z } from 'zod';
import { ZONE_TYPES } from '@/lib/constants/order';
import { DELIVERY_STATUSES, PAYMENT_STATUSES } from '@/lib/constants/order-status';
import { ORDERS_EXPORT_FORMATS } from '@/lib/constants/orders-export';

// Filtres de l'export (cahier P-55) : période, statuts, zone. Venus de l'adresse (`?format=xlsx&from=…`), donc
// tout arrive en texte : un champ vide d'un formulaire vaut « pas de filtre ».

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isoDate = z
  .string()
  .regex(DATE_PATTERN, 'Date invalide (format AAAA-MM-JJ).')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Cette date n’existe pas.');

const optionalDate = isoDate.optional();

export const ordersExportQuerySchema = z
  .object({
    format: z.enum(ORDERS_EXPORT_FORMATS, { errorMap: () => ({ message: 'Choisissez Excel ou CSV.' }) }),
    from: optionalDate,
    to: optionalDate,
    deliveryStatuses: z.array(z.enum(DELIVERY_STATUSES)),
    paymentStatuses: z.array(z.enum(PAYMENT_STATUSES)),
    zones: z.array(z.enum(ZONE_TYPES)),
  })
  .superRefine((value, context) => {
    if (value.from && value.to && value.from > value.to) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'La date de fin est avant la date de début.' });
    }
  });

export type OrdersExportQuery = z.infer<typeof ordersExportQuerySchema>;

const unique = (values: string[]): string[] => [...new Set(values)];
const nonEmpty = (values: string[]): string[] => values.map((value) => value.trim()).filter((value) => value !== '');

/**
 * Lit les paramètres d'adresse. Les paramètres inconnus sont ignorés ; un champ répété (`zone=A&zone=B`) donne
 * plusieurs valeurs ; une valeur vide n'est pas un filtre.
 */
export function parseOrdersExportQuery(params: URLSearchParams): OrdersExportQuery {
  const single = (name: string): string | undefined => nonEmpty([params.get(name) ?? ''])[0];
  return ordersExportQuerySchema.parse({
    format: single('format'),
    from: single('from'),
    to: single('to'),
    deliveryStatuses: unique(nonEmpty(params.getAll('deliveryStatus'))),
    paymentStatuses: unique(nonEmpty(params.getAll('paymentStatus'))),
    zones: unique(nonEmpty(params.getAll('zone'))),
  });
}
