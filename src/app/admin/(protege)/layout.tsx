import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminMobileMenu } from '@/components/admin/AdminMobileMenu';
import { AdminNav } from '@/components/admin/AdminNav';
import { ADMIN_HOME_PATH } from '@/lib/constants/auth';
import { requireAdminPage } from '@/server/auth/guards';
import { AdminAccount } from './AdminAccount';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Coque du back-office. Ordinateur : menu latéral marron + contenu. Téléphone et tablette : barre du haut (logo, compte)
 * et barre de navigation flottante en bas. Les styles sont dans styles/admin.css.
 */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  // Vérification réelle de la session : le middleware ne fait qu'un tri rapide.
  const admin = await requireAdminPage();
  const isOwner = admin.role === 'OWNER';
  const initial = admin.name.trim().charAt(0) || '?';

  return (
    <div className="admin-app">
      <a className="admin-skip" href="#admin-contenu">
        Aller au contenu
      </a>

      <aside className="admin-side" aria-label="Menu du back-office">
        <Link href={ADMIN_HOME_PATH} className="admin-brand" aria-label="Back-office Meëra Kinks : tableau de bord">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-meera-kinks-beige.png" alt="" width={240} height={94} />
          <span className="admin-side-tag" aria-hidden="true">
            Back-office
          </span>
        </Link>
        <AdminNav variant="side" isOwner={isOwner} />
        <div className="admin-side-foot">
          <AdminAccount name={admin.name} isOwner={isOwner} />
        </div>
      </aside>
      <div className="admin-side-edge" aria-hidden="true" />

      <div className="admin-body">
        <header className="admin-topbar">
          <Link href={ADMIN_HOME_PATH} className="admin-brand" aria-label="Back-office Meëra Kinks : tableau de bord">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-meera-kinks-beige.png" alt="" width={240} height={94} />
          </Link>
          <AdminMobileMenu initial={initial}>
            <AdminAccount name={admin.name} isOwner={isOwner} />
          </AdminMobileMenu>
        </header>

        <div id="admin-contenu" className="admin-content" tabIndex={-1}>
          {children}
        </div>
      </div>

      <AdminNav variant="tabs" isOwner={isOwner} />
    </div>
  );
}
