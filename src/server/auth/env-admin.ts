// Compte propriétaire piloté par l'environnement : ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME.
//
// La source de vérité est l'environnement du serveur (Vercel, .env) : le compte est créé s'il n'existe pas, et son mot de
// passe est réaligné s'il a changé. La base ne garde que le HASH bcrypt (jamais le mot de passe), comme pour tout compte :
// la vérification à la connexion, les sessions et la limitation des tentatives ne changent pas.
//
// Ce module ne touche pas à la base tout seul (le client est passé en paramètre) : le seed et la page de connexion
// l'utilisent de la même façon.
import type { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { emailField, newPasswordSchema } from '@/lib/validation/auth.schema';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { logError, logInfo } from '@/server/logger';

export const DEFAULT_ADMIN_NAME = 'Propriétaire';
const NAME_MAX = 80;

export interface EnvAdminCredentials {
  email: string;
  password: string;
  name: string;
}

export type EnvAdminConfig =
  | { status: 'absent' }
  | { status: 'invalid'; problems: string[] }
  | ({ status: 'ok' } & EnvAdminCredentials);

type EnvSource = Record<string, string | undefined>;

/**
 * Lit et valide les variables. « absent » : ni email ni mot de passe (le compte n'est pas piloté par l'environnement) ;
 * « invalid » : l'un manque ou est refusé. Les problèmes citent le NOM de la variable et la règle, jamais sa valeur.
 */
export function readEnvAdminConfig(env: EnvSource = process.env): EnvAdminConfig {
  const rawEmail = env.ADMIN_EMAIL?.trim() ?? '';
  const rawPassword = env.ADMIN_PASSWORD ?? '';
  if (rawEmail === '' && rawPassword === '') return { status: 'absent' };

  const problems: string[] = [];
  const email = emailField.safeParse(rawEmail);
  if (!email.success) problems.push(rawEmail === '' ? 'ADMIN_EMAIL est manquante.' : 'ADMIN_EMAIL n’est pas une adresse valide.');
  const password = newPasswordSchema.safeParse(rawPassword);
  if (!password.success) problems.push(rawPassword === '' ? 'ADMIN_PASSWORD est manquante.' : `ADMIN_PASSWORD : ${password.error.issues[0]?.message ?? 'refusé.'}`);
  if (problems.length > 0 || !email.success || !password.success) return { status: 'invalid', problems };

  const name = (env.ADMIN_NAME?.trim() || DEFAULT_ADMIN_NAME).slice(0, NAME_MAX);
  return { status: 'ok', email: email.data, password: password.data, name };
}

/** Ce compte est-il piloté par l'environnement ? (Alors son mot de passe ne se change pas depuis l'écran du back-office.) */
export function isEnvManagedEmail(email: string | null | undefined, env: EnvSource = process.env): boolean {
  if (!email) return false;
  const config = readEnvAdminConfig(env);
  return config.status === 'ok' && config.email === email.trim().toLowerCase();
}

type AdminDb = {
  adminUser: Pick<PrismaClient['adminUser'], 'findUnique' | 'create' | 'update'>;
  adminSession: Pick<PrismaClient['adminSession'], 'deleteMany'>;
};

export type EnvAdminSyncResult = 'created' | 'updated' | 'unchanged';

const isUniqueViolation = (error: unknown): boolean => typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';

/**
 * Aligne la base sur l'environnement : crée le compte PROPRIÉTAIRE, ou corrige son mot de passe, son nom, son rôle et son
 * état « actif » s'ils ont changé. Un mot de passe changé ou un compte réactivé ferme les sessions ouvertes.
 * Idempotent : sans changement, ne fait aucune écriture.
 */
export async function syncEnvAdmin(db: AdminDb, credentials: EnvAdminCredentials, retryOnRace = true): Promise<EnvAdminSyncResult> {
  const existing = await db.adminUser.findUnique({
    where: { email: credentials.email },
    select: { id: true, name: true, role: true, isActive: true, passwordHash: true },
  });

  if (!existing) {
    try {
      await db.adminUser.create({
        data: { email: credentials.email, name: credentials.name, passwordHash: await hashPassword(credentials.password), role: 'OWNER' },
        select: { id: true },
      });
      return 'created';
    } catch (error) {
      // Deux instances serveur ont démarré en même temps : l'autre a créé le compte, on reprend sur la ligne existante.
      if (retryOnRace && isUniqueViolation(error)) return syncEnvAdmin(db, credentials, false);
      throw error;
    }
  }

  const samePassword = await verifyPassword(credentials.password, existing.passwordHash);
  const changes: { passwordHash?: string; name?: string; role?: 'OWNER'; isActive?: true } = {};
  if (!samePassword) changes.passwordHash = await hashPassword(credentials.password);
  if (existing.name !== credentials.name) changes.name = credentials.name;
  if (existing.role !== 'OWNER') changes.role = 'OWNER';
  if (!existing.isActive) changes.isActive = true;
  if (Object.keys(changes).length === 0) return 'unchanged';

  await db.adminUser.update({ where: { id: existing.id }, data: changes, select: { id: true } });
  if (!samePassword || !existing.isActive) await db.adminSession.deleteMany({ where: { adminUserId: existing.id } });
  return 'updated';
}

// ---------------------------------------------------------------------------
// À la connexion : une fois par instance serveur et par valeur d'environnement
// ---------------------------------------------------------------------------

let appliedFingerprint: string | null = null;
let inFlight: Promise<void> | null = null;

const fingerprint = (config: EnvAdminConfig): string => createHash('sha256').update(JSON.stringify(config)).digest('hex');

/** Pour les tests : oublie ce qui a déjà été appliqué. */
export function resetEnvAdminCache(): void {
  appliedFingerprint = null;
  inFlight = null;
}

/**
 * À appeler avant de vérifier une connexion. Sans variables, ne fait rien (aucun accès à la base). Avec des variables
 * valides, aligne la base une fois (le coût d'un hash bcrypt n'est payé qu'au premier passage de l'instance). Ne lève
 * jamais : une base momentanément injoignable ne doit pas casser une connexion avec un compte déjà en base.
 */
export async function ensureEnvAdmin(db: AdminDb, env: EnvSource = process.env): Promise<void> {
  const config = readEnvAdminConfig(env);
  if (config.status === 'absent') return;
  const key = fingerprint(config);
  if (appliedFingerprint === key) return;

  if (config.status === 'invalid') {
    appliedFingerprint = key; // à ne signaler qu'une fois
    logError('admin.env.invalid', { problems: config.problems });
    return;
  }

  inFlight ??= syncEnvAdmin(db, config)
    .then((result) => {
      appliedFingerprint = key;
      if (result !== 'unchanged') logInfo('admin.env.synced', { result });
    })
    .catch((error: unknown) => {
      logError('admin.env.sync_failed', {}, error); // pas de mémorisation : on réessaie à la prochaine connexion
    })
    .finally(() => {
      inFlight = null;
    });
  await inFlight;
}
