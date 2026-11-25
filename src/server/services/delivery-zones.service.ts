import { Prisma } from '@prisma/client';
import { STORE_SETTINGS_ID } from '@/lib/constants/store';
import type { DeliveryNotesData, DeliveryZoneData } from '@/lib/validation/delivery-zone.schema';
import { prisma } from '@/server/db';
import { HttpError } from '@/server/http';
import { revalidateDelivery } from '@/server/services/catalog-cache';

// Gestion des zones de livraison par la vendeuse (back-office). Archiver (isActive = false) est le geste normal :
// une zone archivée disparaît du formulaire de commande mais reste lisible sur les commandes déjà passées.

export async function listDeliveryZones() {
  return prisma.deliveryZone.findMany({
    orderBy: [{ type: 'asc' }, { position: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      type: true,
      fee: true,
      deliveryMinHours: true,
      deliveryMaxHours: true,
      isActive: true,
      position: true,
      _count: { select: { orders: true } },
    },
  });
}

export async function getDeliveryNotes(): Promise<DeliveryNotesData> {
  const settings = await prisma.storeSettings.findUnique({
    where: { id: STORE_SETTINGS_ID },
    select: { deliveryLeadTimeNote: true, deliveryRules: true },
  });
  return { deliveryLeadTimeNote: settings?.deliveryLeadTimeNote ?? null, deliveryRules: settings?.deliveryRules ?? null };
}

const nameTakenError = () =>
  new HttpError(409, 'CONFLICT', 'Cette zone existe déjà.', { fields: { name: ['Une zone de ce type porte déjà ce nom.'] } });

function rethrowKnownErrors(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw nameTakenError();
    if (error.code === 'P2025') throw new HttpError(404, 'NOT_FOUND', 'Zone introuvable.');
  }
  throw error;
}

const toRow = (data: DeliveryZoneData) => ({
  name: data.name,
  type: data.type,
  fee: data.fee,
  deliveryMinHours: data.deliveryMinHours,
  deliveryMaxHours: data.deliveryMaxHours,
  isActive: data.isActive,
  position: data.position,
});

export async function createDeliveryZone(data: DeliveryZoneData): Promise<{ id: string }> {
  try {
    const zone = await prisma.deliveryZone.create({ data: toRow(data), select: { id: true } });
    revalidateDelivery();
    return zone;
  } catch (error) {
    return rethrowKnownErrors(error);
  }
}

export async function updateDeliveryZone(id: string, data: DeliveryZoneData): Promise<{ id: string }> {
  try {
    await prisma.deliveryZone.update({ where: { id }, data: toRow(data), select: { id: true } });
  } catch (error) {
    return rethrowKnownErrors(error);
  }
  revalidateDelivery();
  return { id };
}

/**
 * Supprimer détache la zone des commandes déjà passées (elles gardent la ville et le pays figés). Si la zone a des
 * commandes, on conseille l'archivage : l'historique de la zone reste alors lisible.
 */
export async function deleteDeliveryZone(id: string): Promise<void> {
  try {
    await prisma.deliveryZone.delete({ where: { id } });
  } catch (error) {
    return rethrowKnownErrors(error);
  }
  revalidateDelivery();
}

export async function updateDeliveryNotes(data: DeliveryNotesData): Promise<void> {
  const result = await prisma.storeSettings.updateMany({
    where: { id: STORE_SETTINGS_ID },
    data: { deliveryLeadTimeNote: data.deliveryLeadTimeNote, deliveryRules: data.deliveryRules },
  });
  if (result.count === 0) throw new HttpError(404, 'NOT_FOUND', 'Les paramètres de la boutique n’existent pas encore (lancez le seed).');
  revalidateDelivery();
}
