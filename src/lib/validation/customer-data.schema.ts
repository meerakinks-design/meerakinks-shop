import { z } from 'zod';
import { ORDER_LIMITS } from '@/lib/constants/order';
import { DEFAULT_DIAL_CODE } from '@/lib/shop/phone';

/** Effacement d'un client sur sa demande : le numéro qu'il a donné en commandant, plus une confirmation explicite. */
export const anonymizeCustomerSchema = z.object({
  phoneDialCode: z.string().trim().max(8).default(DEFAULT_DIAL_CODE),
  phone: z
    .string({ required_error: 'Indique le numéro de téléphone du client.', invalid_type_error: 'Indique le numéro de téléphone du client.' })
    .trim()
    .min(1, 'Indique le numéro de téléphone du client.')
    .max(ORDER_LIMITS.phone, 'Ce numéro de téléphone est trop long.'),
  /** Garde-fou côté serveur : l'effacement est définitif, un appel sans confirmation n'efface rien. */
  confirm: z.literal(true, { errorMap: () => ({ message: 'Coche la case pour confirmer : cette action est définitive.' }) }),
});

export type AnonymizeCustomerInput = z.infer<typeof anonymizeCustomerSchema>;
