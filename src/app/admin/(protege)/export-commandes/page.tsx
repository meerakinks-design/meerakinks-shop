import type { Metadata } from 'next';
import Link from 'next/link';
import { OrdersExportForm } from '@/components/admin/OrdersExportForm';
import { ADMIN_HOME_PATH } from '@/lib/constants/auth';
import { requireAdminPage } from '@/server/auth/guards';

export const metadata: Metadata = { title: 'Export des commandes' };
export const dynamic = 'force-dynamic';

export default async function AdminOrdersExportPage() {
  const admin = await requireAdminPage();

  if (admin.role !== 'OWNER') {
    return (
      <main>
        <div className="page-head">
          <h1>Export des commandes</h1>
        </div>
        <p>Cette page est réservée au compte propriétaire.</p>
        <p>
          <Link href={ADMIN_HOME_PATH}>Retour au tableau de bord</Link>
        </p>
      </main>
    );
  }

  return (
    <main>
      <div className="page-head">
        <h1>Export des commandes</h1>
      </div>
      <div className="card" style={{ maxWidth: '40rem' }}>
        <h2>Télécharger les commandes</h2>
        <p className="alert-note" role="note" style={{ marginBottom: 'var(--space-4)' }}>
          Le fichier contient les noms, les téléphones et les adresses de vos clients. Le site ne le conserve pas : il est créé au moment du
          téléchargement. Une fois sur votre appareil, il est sous votre responsabilité. Ne le partagez qu’avec des personnes autorisées, ne le
          laissez pas sur un ordinateur partagé et supprimez-le quand vous n’en avez plus besoin.
        </p>
        <OrdersExportForm />
      </div>
      <p className="help-text" style={{ marginTop: 'var(--space-4)', maxWidth: '40rem' }}>
        Chaque export est inscrit au journal : compte, date, filtres et nombre de commandes (jamais le contenu du fichier). Dans le fichier, une
        cellule de texte qui commence par = + - ou @ est précédée d’une apostrophe : c’est une protection voulue, qui vise aussi les numéros de
        téléphone commençant par +.
      </p>
    </main>
  );
}
