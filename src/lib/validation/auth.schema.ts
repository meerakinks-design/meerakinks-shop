import { z } from 'zod';
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from '@/lib/constants/auth';

const emailField = z
  .string({ required_error: 'Renseigne ton email.' })
  .trim()
  .toLowerCase()
  .email('Cet email ne semble pas valide.')
  .max(254);

export const loginSchema = z.object({
  email: emailField,
  // Pas de règle de complexité ici : on ne dit jamais à quoi ressemble un bon mot de passe
  // à quelqu'un qui tente de se connecter.
  password: z.string({ required_error: 'Renseigne ton mot de passe.' }).min(1, 'Renseigne ton mot de passe.').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Utilisé pour CRÉER ou CHANGER un mot de passe (seed aujourd'hui, page « compte » plus tard).
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
    message: `Le mot de passe est trop long (${PASSWORD_MAX_BYTES} octets maximum).`,
  });

export { emailField };
