import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '@/lib/constants/auth';

export function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_COST);
}

export function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

// Hash factice (coût 12), comparé quand l'email est inconnu : le temps de réponse est alors
// le même qu'avec un vrai compte, et ne révèle pas quels emails existent.
const DUMMY_PASSWORD_HASH = '$2a$12$AOMyxFV3nnZSyeUJCXIkJ.7V4ROUDxuiplUSluTRvWH/LWbGk9Ruy';

export async function spendTimeLikeARealCheck(plainPassword: string): Promise<void> {
  await bcrypt.compare(plainPassword, DUMMY_PASSWORD_HASH);
}
