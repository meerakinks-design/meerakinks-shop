import {
  PASSWORD_CHANGE_MAX_ATTEMPTS,
  PASSWORD_CHANGE_WINDOW_SECONDS,
  SESSION_TTL_MS,
} from '@/lib/constants/auth';
import type { ChangePasswordInput } from '@/lib/validation/auth.schema';
import { prisma } from '@/server/db';
import { HttpError } from '@/server/http';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { generateSessionToken, hashToken } from '@/server/auth/tokens';
import { auditEntry } from '@/server/services/audit.service';
import { consumeRateLimit, resetRateLimit } from '@/server/services/rate-limit';

export interface PasswordChangeResult {
  /** Jeton de la NOUVELLE session de cet appareil (les autres sont révoquées). À poser dans le cookie. */
  token: string;
  expiresAt: Date;
}

/**
 * Change le mot de passe d'un administrateur connecté (cahier §10.2 : « révoque les sessions »).
 *
 *  1. Limite par compte : 5 essais / 15 min (une session volée ne permet pas de deviner le mot de passe actuel).
 *  2. Vérifie le mot de passe actuel.
 *  3. En UNE transaction : nouveau hash, suppression de TOUTES les sessions du compte, ouverture d'une session neuve
 *     pour cet appareil (nouveau jeton : le précédent ne sert plus), entrée de journal. Si une étape échoue, rien
 *     n'est changé.
 *
 * L'utilisateur reste donc connecté ici, et déconnecté partout ailleurs : si quelqu'un d'autre tenait une session
 * ouverte, elle ne vaut plus rien.
 */
export async function changeAdminPassword(input: ChangePasswordInput & { adminId: string; userAgent: string | null }): Promise<PasswordChangeResult> {
  const limitKey = `password-change:admin:${input.adminId}`;
  const limit = await consumeRateLimit(limitKey, PASSWORD_CHANGE_MAX_ATTEMPTS, PASSWORD_CHANGE_WINDOW_SECONDS);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    throw new HttpError(429, 'RATE_LIMITED', `Trop de tentatives. Réessaie dans ${minutes} minute${minutes > 1 ? 's' : ''}.`, {
      retryable: true,
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const user = await prisma.adminUser.findUnique({ where: { id: input.adminId }, select: { id: true, isActive: true, passwordHash: true } });
  if (!user || !user.isActive) throw new HttpError(401, 'UNAUTHENTICATED', 'Connexion requise.');

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Certaines informations sont invalides.', {
      fields: { currentPassword: ['Mot de passe actuel incorrect.'] },
    });
  }

  const passwordHash = await hashPassword(input.newPassword);
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.$transaction([
    prisma.adminUser.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.adminSession.deleteMany({ where: { adminUserId: user.id } }),
    prisma.adminSession.create({
      data: { tokenHash: hashToken(token), adminUserId: user.id, userAgent: input.userAgent?.slice(0, 255) ?? null, expiresAt },
    }),
    auditEntry({ action: 'ADMIN_PASSWORD_CHANGED', adminUserId: user.id }),
  ]);

  await resetRateLimit(limitKey);
  return { token, expiresAt };
}
