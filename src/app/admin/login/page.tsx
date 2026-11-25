import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ADMIN_HOME_PATH, IS_PRODUCTION } from '@/lib/constants/auth';
import { readEnvAdminConfig } from '@/server/auth/env-admin';
import { getCurrentAdmin } from '@/server/auth/session';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Connexion', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await getCurrentAdmin()) redirect(ADMIN_HOME_PATH);

  // Aide pour le développeur, jamais en production : on n'y dit rien sur la configuration du serveur.
  const envConfig = IS_PRODUCTION ? null : readEnvAdminConfig();

  return (
    <main className="login-wrap">
      <div className="login-portal">
        <div className="login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-meera-kinks-beige.png" alt="Meëra Kinks" width={240} height={94} />
          <p className="login-script" aria-hidden="true">
            Bienvenue
          </p>
          <p>Espace de gestion de la boutique</p>
        </div>
        <div className="card login-card">
          <h1>Connexion</h1>
          <p className="help-text" style={{ marginBottom: 'var(--space-4)' }}>
            Réservé à la vendeuse et à son équipe.
          </p>
          {envConfig && envConfig.status !== 'ok' && (
            <p className="alert-note" role="note">
              {envConfig.status === 'absent'
                ? 'Développement : renseigne ADMIN_EMAIL et ADMIN_PASSWORD dans .env pour créer le compte (voir .env.example).'
                : `Développement : ${envConfig.problems.join(' ')}`}
            </p>
          )}
          <LoginForm />
        </div>
        <p className="login-back">
          <Link href="/">← Retour à la boutique</Link>
        </p>
      </div>
    </main>
  );
}
