import { cache } from 'react';
import { cookies } from 'next/headers';
import type { AdminRole } from '@prisma/client';
import { IS_PRODUCTION, SESSION_COOKIE_NAME, SESSION_TTL_MS } from '@/lib/constants/auth';
import { prisma } from '@/server/db';
import { generateSessionToken, hashToken } from '@/server/auth/tokens';

export interface AdminIdentity {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

export async function createSession(adminUserId: string, userAgent: string | null) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.adminSession.create({
    data: { tokenHash: hashToken(token), adminUserId, userAgent: userAgent?.slice(0, 255) ?? null, expiresAt },
  });
  return { token, expiresAt };
}

export function setSessionCookie(token: string, expiresAt: Date): void {
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true, // illisible par le JavaScript de la page : un XSS ne peut pas voler la session
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(): void {
  cookies().set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Administrateur de la requête en cours, ou null. Le `select` exclut volontairement
 * passwordHash : le hash ne quitte jamais la couche de connexion.
 * Mis en cache pour la durée d'une requête (layout et page appellent la même fonction).
 */
export const getCurrentAdmin = cache(async (): Promise<AdminIdentity | null> => {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      adminUser: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
  });
  if (!session || session.expiresAt <= new Date() || !session.adminUser.isActive) return null;

  const { id, name, email, role } = session.adminUser;
  return { id, name, email, role };
});

export async function destroyCurrentSession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (token) await prisma.adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  clearSessionCookie();
}

/** À appeler au changement de mot de passe ou à la désactivation d'un compte. */
export async function revokeAllSessions(adminUserId: string): Promise<void> {
  await prisma.adminSession.deleteMany({ where: { adminUserId } });
}

export async function purgeExpiredSessions(): Promise<void> {
  await prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
