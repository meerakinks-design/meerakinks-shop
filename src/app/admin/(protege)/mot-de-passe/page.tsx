import type { Metadata } from 'next';
import { ChangePasswordForm } from '@/components/admin/ChangePasswordForm';
import { requireAdminPage } from '@/server/auth/guards';

export const metadata: Metadata = { title: 'Mot de passe' };
export const dynamic = 'force-dynamic';

export default async function AdminPasswordPage() {
  await requireAdminPage();

  return (
    <main>
      <div className="page-head">
        <h1>Mot de passe</h1>
      </div>
      <div className="card" style={{ maxWidth: '32rem' }}>
        <p className="help-text" style={{ marginBottom: 'var(--space-4)' }}>
          Après le changement, tous les autres appareils connectés à ce compte sont déconnectés. Celui-ci reste connecté.
        </p>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
