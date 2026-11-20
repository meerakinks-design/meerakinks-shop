import Link from 'next/link';
import { requireAdminPage } from '@/server/auth/guards';

export const dynamic = 'force-dynamic';

// Tableau de bord provisoire : les compteurs réels (commandes par statut) arrivent à l'étape 6.
export default async function AdminDashboardPage() {
  const admin = await requireAdminPage();

  return (
    <main>
      <h1>Bonjour {admin.name}</h1>
      <p>Les commandes arrivent dans une prochaine étape. Pour l’instant, tu peux préparer ton catalogue.</p>
      <p>
        <Link className="btn" href="/admin/produits">
          Gérer les produits
        </Link>
      </p>
    </main>
  );
}
