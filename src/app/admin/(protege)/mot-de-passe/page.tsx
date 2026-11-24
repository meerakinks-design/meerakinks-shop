import type { Metadata } from 'next';
import { ChangePasswordForm } from '@/components/admin/ChangePasswordForm';
import { isEnvManagedEmail } from '@/server/auth/env-admin';
import { requireAdminPage } from '@/server/auth/guards';
import { ENV_MANAGED_PASSWORD_MESSAGE } from '@/server/auth/password-change.service';

export const metadata: Metadata = { title: 'Mot de passe' };
export const dynamic = 'force-dynamic';

export default async function AdminPasswordPage() {
  const admin = await requireAdminPage();
  const managedByEnv = isEnvManagedEmail(admin.email);

  return (
    <main>
      <div className="page-head">
        <h1>Mot de passe</h1>
      </div>
      <div className="card" style={{ maxWidth: '32rem' }}>
        {managedByEnv ? (
          <p role="note">{ENV_MANAGED_PASSWORD_MESSAGE}</p>
        ) : (
          <>
            <p className="help-text" style={{ marginBottom: 'var(--space-4)' }}>
              Après le changement, tous les autres appareils connectés à ce compte sont déconnectés. Celui-ci reste connecté.
            </p>
            <ChangePasswordForm />
          </>
        )}
      </div>
    </main>
  );
}
