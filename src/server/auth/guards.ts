import { redirect } from 'next/navigation';
import { ADMIN_LOGIN_PATH } from '@/lib/constants/auth';
import { HttpError } from '@/server/http';
import { getCurrentAdmin, type AdminIdentity } from '@/server/auth/session';

// Le middleware ne fait qu'un tri rapide (cookie présent ou non). La vraie vérification
// est ICI, dans chaque page et chaque route : c'est elle qui fait foi.

/** Pour les pages et layouts du back-office. */
export async function requireAdminPage(): Promise<AdminIdentity> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(ADMIN_LOGIN_PATH);
  return admin;
}

/** Pour les routes API du back-office. */
export async function requireAdminApi(): Promise<AdminIdentity> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new HttpError(401, 'UNAUTHENTICATED', 'Connexion requise.');
  return admin;
}

/** Pour les actions réservées au compte propriétaire (paramètres, comptes). */
export async function requireOwnerApi(): Promise<AdminIdentity> {
  const admin = await requireAdminApi();
  if (admin.role !== 'OWNER') throw new HttpError(403, 'FORBIDDEN', 'Action réservée au compte propriétaire.');
  return admin;
}
