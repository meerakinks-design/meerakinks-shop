import type { Metadata } from 'next';
import Link from 'next/link';
import { DeliveryZonesManager } from '@/components/admin/DeliveryZonesManager';
import { ADMIN_HOME_PATH } from '@/lib/constants/auth';
import { requireAdminPage } from '@/server/auth/guards';
import { getDeliveryNotes, listDeliveryZones } from '@/server/services/delivery-zones.service';

export const metadata: Metadata = { title: 'Livraison' };
export const dynamic = 'force-dynamic';

export default async function DeliveryPage() {
  const admin = await requireAdminPage();
  if (admin.role !== 'OWNER') {
    return (
      <main>
        <div className="page-head">
          <h1>Livraison</h1>
        </div>
        <p>Cette page est réservée au compte propriétaire.</p>
        <p>
          <Link href={ADMIN_HOME_PATH}>Retour au tableau de bord</Link>
        </p>
      </main>
    );
  }
  const [zones, notes] = await Promise.all([listDeliveryZones(), getDeliveryNotes()]);

  return (
    <main>
      <div className="page-head">
        <h1>Livraison</h1>
      </div>
      <p className="help-text">
        Zones desservies, frais et délais indicatifs. Ce que vous enregistrez ici s’affiche tel quel dans le formulaire de commande, la page de confirmation, la FAQ et les messages envoyés aux clientes.
      </p>
      <DeliveryZonesManager
        notes={notes}
        zones={zones.map((zone) => ({
          id: zone.id,
          name: zone.name,
          type: zone.type,
          fee: zone.fee,
          deliveryMinHours: zone.deliveryMinHours,
          deliveryMaxHours: zone.deliveryMaxHours,
          isActive: zone.isActive,
          position: zone.position,
          orderCount: zone._count.orders,
        }))}
      />
    </main>
  );
}
