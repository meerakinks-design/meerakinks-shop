import { STORE_SETTINGS_ID } from '@/lib/constants/store';
import type { StoreSettingsData } from '@/lib/validation/settings.schema';
import { prisma } from '@/server/db';
import { HttpError } from '@/server/http';
import { auditEntry } from '@/server/services/audit.service';
import { revalidateDelivery } from '@/server/services/catalog-cache';

// Paramètres de la boutique (écran /admin/parametres, propriétaire). Les textes de livraison et les délais ont leur propre
// écran (/admin/livraison) : ils ne sont ni lus ni écrasés ici.

const SETTINGS_SELECT = {
  storeName: true,
  contactEmail: true,
  contactPhone: true,
  legalName: true,
  address: true,
  sellerWhatsApp: true,
  notificationEmail: true,
  waveNumber: true,
  depositAmount: true,
  paymentRules: true,
  instagramUrl: true,
  tiktokUrl: true,
  facebookUrl: true,
} as const;

export async function getStoreSettings(): Promise<StoreSettingsData | null> {
  return prisma.storeSettings.findUnique({ where: { id: STORE_SETTINGS_ID }, select: SETTINGS_SELECT });
}

/** Noms des champs dont la valeur change : c'est ce que garde le journal (jamais les valeurs elles-mêmes). */
export function changedFields(before: StoreSettingsData, after: StoreSettingsData): string[] {
  return (Object.keys(SETTINGS_SELECT) as (keyof StoreSettingsData)[]).filter((key) => before[key] !== after[key]);
}

export async function updateStoreSettings(data: StoreSettingsData, admin: { id: string }): Promise<{ changed: string[] }> {
  const before = await getStoreSettings();
  if (!before) throw new HttpError(404, 'NOT_FOUND', 'Les paramètres de la boutique n’existent pas encore (lancez le seed).');
  const changed = changedFields(before, data);
  if (changed.length === 0) return { changed };
  await prisma.$transaction([
    prisma.storeSettings.update({ where: { id: STORE_SETTINGS_ID }, data, select: { id: true } }),
    auditEntry({ action: 'SETTINGS_UPDATED', adminUserId: admin.id, details: { fields: changed.join(',') } }),
  ]);
  // Le nom, le WhatsApp, l'acompte et les réseaux sont lus partout sur la vitrine (layout) : on la rafraîchit en entier.
  revalidateDelivery();
  return { changed };
}
