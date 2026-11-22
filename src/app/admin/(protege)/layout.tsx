import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';
import { ADMIN_PASSWORD_PATH } from '@/lib/constants/auth';
import { ADMIN_ORDERS_EXPORT_PATH } from '@/lib/constants/orders-export';
import { ADMIN_CUSTOMER_DATA_PATH } from '@/lib/constants/retention';
import { requireAdminPage } from '@/server/auth/guards';
import { LogoutButton } from './LogoutButton';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  // Vérification réelle de la session : le middleware ne fait qu'un tri rapide.
  const admin = await requireAdminPage();
  return (
    <div className="container">
      <header className="admin-bar">
        <strong>Back-office</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>{admin.name}</span>
          {admin.role === 'OWNER' && <Link href={ADMIN_ORDERS_EXPORT_PATH}>Export des commandes</Link>}
          {admin.role === 'OWNER' && <Link href={ADMIN_CUSTOMER_DATA_PATH}>Données clients</Link>}
          <Link href={ADMIN_PASSWORD_PATH}>Mot de passe</Link>
          <LogoutButton />
        </div>
      </header>
      <AdminNav />
      {children}
    </div>
  );
}
