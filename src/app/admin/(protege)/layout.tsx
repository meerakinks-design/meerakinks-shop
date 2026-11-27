import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdminPage } from '@/server/auth/guards';
import { AdminAccount } from './AdminAccount';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Coque du back-office. Ordinateur : barre latérale (façon E-Carnet, repliable) + contenu. Téléphone et tablette : en-tête de la
 * landing (logo, bouton « Boutique », compte) et barre de navigation flottante en bas. Le rendu est dans AdminShell ; les styles
 * dans styles/admin.css.
 */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  // Vérification réelle de la session : le middleware ne fait qu'un tri rapide.
  const admin = await requireAdminPage();
  const isOwner = admin.role === 'OWNER';
  const initial = admin.name.trim().charAt(0) || '?';

  return (
    <AdminShell isOwner={isOwner} name={admin.name} initial={initial} sidebarAccount={<AdminAccount name={admin.name} isOwner={isOwner} />} sheetAccount={<AdminAccount name={admin.name} isOwner={isOwner} />}>
      {children}
    </AdminShell>
  );
}
