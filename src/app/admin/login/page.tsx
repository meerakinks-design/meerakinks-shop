import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ADMIN_HOME_PATH } from '@/lib/constants/auth';
import { getCurrentAdmin } from '@/server/auth/session';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Connexion', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await getCurrentAdmin()) redirect(ADMIN_HOME_PATH);

  return (
    <main className="login-wrap">
      <div className="card login-card">
        <h1>Connexion</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Espace réservé à la gestion de la boutique.</p>
        <LoginForm />
      </div>
    </main>
  );
}
