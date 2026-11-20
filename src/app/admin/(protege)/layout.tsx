import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/AdminNav';
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
          <LogoutButton />
        </div>
      </header>
      <AdminNav />
      {children}
    </div>
  );
}
