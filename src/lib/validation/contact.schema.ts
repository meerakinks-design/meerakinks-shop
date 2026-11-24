import { z } from 'zod';
import { CONTACT_LIMITS, CONTACT_TOPICS, REPLY_CHANNELS } from '@/lib/constants/contact';
import { IDEMPOTENCY_KEY_PATTERN, ORDER_REFERENCE_PATTERN } from '@/lib/constants/order';
import { DEFAULT_DIAL_CODE, normalizePhone } from '@/lib/shop/phone';

// Formulaire de contact : le MÊME schéma valide le navigateur (confort) et le serveur (vérité).
// « Intelligent » : le champ exigé dépend des choix (WhatsApp → numéro ; e-mail → adresse ; commande → référence).

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const CONTROL_CHARACTERS_EXCEPT_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f]/;
const FORBIDDEN_CHARACTERS = 'Certains caractères ne sont pas autorisés.';
const tooLong = (max: number) => `Maximum ${max} caractères.`;

/** Une chaîne vide (champ laissé vide) devient « absent ». */
const blankToUndefined = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

export const contactInputSchema = z
  .object({
    topic: z.enum(CONTACT_TOPICS, { errorMap: () => ({ message: 'Choisissez votre sujet.' }) }),
    name: z
      .string({ required_error: 'Indiquez votre nom.', invalid_type_error: 'Indiquez votre nom.' })
      .trim()
      .min(1, 'Indiquez votre nom.')
      .min(2, 'Votre nom est trop court.')
      .max(CONTACT_LIMITS.name, tooLong(CONTACT_LIMITS.name))
      .refine((value) => !CONTROL_CHARACTERS.test(value), FORBIDDEN_CHARACTERS),
    replyChannel: z.enum(REPLY_CHANNELS, { errorMap: () => ({ message: 'Choisissez comment recevoir notre réponse.' }) }),
    dialCode: z.preprocess(blankToUndefined, z.string().trim().max(5).optional()),
    phone: z.preprocess(blankToUndefined, z.string().trim().max(30).optional()),
    email: z.preprocess(blankToUndefined, z.string().trim().toLowerCase().max(CONTACT_LIMITS.email, tooLong(CONTACT_LIMITS.email)).email('Adresse e-mail invalide.').optional()),
    orderReference: z.preprocess(blankToUndefined, z.string().trim().toUpperCase().optional()),
    message: z
      .string({ required_error: 'Écrivez votre message.', invalid_type_error: 'Écrivez votre message.' })
      .transform((value) => value.replace(/\r\n?/g, '\n').trim())
      .refine((value) => value.length > 0, 'Écrivez votre message.')
      .refine((value) => value.length === 0 || value.length >= CONTACT_LIMITS.messageMin, `Votre message est trop court (${CONTACT_LIMITS.messageMin} caractères au moins).`)
      .refine((value) => value.length <= CONTACT_LIMITS.message, tooLong(CONTACT_LIMITS.message))
      .refine((value) => !CONTROL_CHARACTERS_EXCEPT_NEWLINE.test(value), FORBIDDEN_CHARACTERS),
    consent: z.literal(true, { errorMap: () => ({ message: 'Cochez la case pour envoyer votre message.' }) }),
    idempotencyKey: z.string({ required_error: 'Clé manquante.' }).regex(IDEMPOTENCY_KEY_PATTERN, 'Clé invalide.'),
    /** Champ piège : un humain ne le voit pas. Traité par la route avant la validation. */
    companyFax: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.replyChannel === 'WHATSAPP') {
      const result = normalizePhone(data.dialCode ?? DEFAULT_DIAL_CODE, data.phone ?? '');
      if (!result.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: result.message });
    }
    if (data.replyChannel === 'EMAIL' && !data.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Indiquez votre adresse e-mail.' });
    }
    if (data.topic === 'ORDER') {
      if (!data.orderReference) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['orderReference'], message: 'Indiquez votre référence de commande.' });
      } else if (!ORDER_REFERENCE_PATTERN.test(data.orderReference)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['orderReference'], message: 'Cette référence n’est pas valide (ex. : CMD-7K3M9QXP).' });
      }
    }
  })
  .transform((data) => {
    const phone = data.replyChannel === 'WHATSAPP' ? normalizePhone(data.dialCode ?? DEFAULT_DIAL_CODE, data.phone ?? '') : null;
    return {
      topic: data.topic,
      name: data.name,
      replyChannel: data.replyChannel,
      phoneE164: phone && phone.ok ? phone.e164 : undefined,
      email: data.email,
      orderReference: data.topic === 'ORDER' ? data.orderReference : undefined,
      message: data.message,
      idempotencyKey: data.idempotencyKey,
    };
  });

export type ContactInput = z.output<typeof contactInputSchema>;
