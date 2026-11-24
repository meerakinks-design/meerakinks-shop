import {
  LOGIN_MAX_ATTEMPTS_PER_EMAIL,
  LOGIN_MAX_ATTEMPTS_PER_IP,
  LOGIN_WINDOW_SECONDS,
} from '@/lib/constants/auth';
import type { LoginInput } from '@/lib/validation/auth.schema';
import { prisma } from '@/server/db';
import { HttpError } from '@/server/http';
import { ensureEnvAdmin } from '@/server/auth/env-admin';
import { spendTimeLikeARealCheck, verifyPassword } from '@/server/auth/password';
import { createSession, purgeExpiredSessions } from '@/server/auth/session';
import { hashIdentifier } from '@/server/auth/tokens';
import { consumeRateLimit, purgeExpiredRateLimits, resetRateLimit } from '@/server/services/rate-limit';

// Un seul message pour « email inconnu », « mot de passe faux » et « compte désactivé » :
// on ne révèle jamais quels comptes existent.
const INVALID_CREDENTIALS = new HttpError(401, 'UNAUTHENTICATED', 'Email ou mot de passe incorrect.');

function tooManyAttempts(retryAfterSeconds: number): HttpError {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return new HttpError(429, 'RATE_LIMITED', `Trop de tentatives. Réessaie dans ${minutes} minute${minutes > 1 ? 's' : ''}.`, {
    retryable: true,
    retryAfterSeconds,
  });
}

export interface AuthenticatedAdmin {
  admin: { name: string; role: 'OWNER' | 'STAFF' };
  token: string;
  expiresAt: Date;
}

export async function authenticateAdmin(
  input: LoginInput & { ip: string; userAgent: string | null },
): Promise<AuthenticatedAdmin> {
  // 1. Limites AVANT toute lecture de compte : elles s'appliquent aussi aux emails inconnus.
  const ipKey = `login:ip:${hashIdentifier(input.ip)}`;
  const emailKey = `login:email:${hashIdentifier(input.email)}`;

  const ipLimit = await consumeRateLimit(ipKey, LOGIN_MAX_ATTEMPTS_PER_IP, LOGIN_WINDOW_SECONDS);
  if (!ipLimit.allowed) throw tooManyAttempts(ipLimit.retryAfterSeconds);
  const emailLimit = await consumeRateLimit(emailKey, LOGIN_MAX_ATTEMPTS_PER_EMAIL, LOGIN_WINDOW_SECONDS);
  if (!emailLimit.allowed) throw tooManyAttempts(emailLimit.retryAfterSeconds);

  // 2. Compte piloté par l'environnement (ADMIN_EMAIL / ADMIN_PASSWORD) : créé ou réaligné avant la vérification.
  //    Après les limites de tentatives : un visiteur qui martèle la page ne déclenche pas de hash. Sans variables : rien.
  await ensureEnvAdmin(prisma);

  //    Vérification du mot de passe, à temps constant que le compte existe ou non.
  const user = await prisma.adminUser.findUnique({
    where: { email: input.email },
    select: { id: true, name: true, role: true, isActive: true, passwordHash: true },
  });
  if (!user || !user.isActive) {
    await spendTimeLikeARealCheck(input.password);
    throw INVALID_CREDENTIALS;
  }
  if (!(await verifyPassword(input.password, user.passwordHash))) throw INVALID_CREDENTIALS;

  // 3. Succès : on repart de zéro pour cet email, on ouvre la session, on fait un peu de ménage.
  await resetRateLimit(emailKey);
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await Promise.all([purgeExpiredSessions(), purgeExpiredRateLimits()]);
  const { token, expiresAt } = await createSession(user.id, input.userAgent);

  return { admin: { name: user.name, role: user.role }, token, expiresAt };
}
