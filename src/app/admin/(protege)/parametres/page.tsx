import type { Metadata } from 'next';
import Link from 'next/link';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { ADMIN_HOME_PATH } from '@/lib/constants/auth';
import { requireAdminPage } from '@/server/auth/guards';
import { getStoreSettings } from '@/server/services/settings.service';

export const metadata: Metadata = { title: 'Paramètres' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const admin = await requireAdminPage();
  if (admin.role !== 'OWNER') {
    return (
      <main>
        <div className="page-head">
          <h1>Paramètres</h1>
        </div>
        <p>Cette page est réservée au compte propriétaire.</p>
        <p>
          <Link href={ADMIN_HOME_PATH}>Retour au tableau de bord</Link>
        </p>
      </main>
    );
  }
  const settings = await getStoreSettings();

  return (
    <main>
      <div className="page-head">
        <h1>Paramètres</h1>
      </div>
      {settings ? (
        <SettingsForm initial={settings} />
      ) : (
        <p className="notice" role="note">
          Les paramètres de la boutique n’existent pas encore : lancez le seed (<code>npm run db:seed</code>), puis rechargez cette page.
        </p>
      )}
    </main>
  );
}
