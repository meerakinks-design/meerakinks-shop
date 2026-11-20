import { describe, expect, it } from 'vitest';
import { loginSchema, newPasswordSchema } from '@/lib/validation/auth.schema';

describe('loginSchema', () => {
  it('normalise l’email (espaces, majuscules)', () => {
    const parsed = loginSchema.parse({ email: '  Vendeuse@Boutique.CI ', password: 'x' });
    expect(parsed.email).toBe('vendeuse@boutique.ci');
  });
  it('refuse un email invalide ou un mot de passe vide, avec le champ concerné', () => {
    const result = loginSchema.safeParse({ email: 'pas-un-email', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.email?.[0]).toBeDefined();
      expect(fields.password?.[0]).toBeDefined();
    }
  });
});

describe('newPasswordSchema', () => {
  it('exige au moins 12 caractères', () => {
    expect(newPasswordSchema.safeParse('court').success).toBe(false);
    expect(newPasswordSchema.safeParse('douze-caracteres').success).toBe(true);
  });
  it('refuse plus de 72 octets (limite de bcrypt)', () => {
    expect(newPasswordSchema.safeParse('a'.repeat(73)).success).toBe(false);
    expect(newPasswordSchema.safeParse('é'.repeat(37)).success).toBe(false); // 74 octets
  });
});
