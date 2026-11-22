import type { Metadata } from 'next';
import Link from 'next/link';
import { AnonymizeCustomerForm } from '@/components/admin/AnonymizeCustomerForm';
import { ADMIN_HOME_PATH } from '@/lib/constants/auth';
import { CUSTOMER_RETENTION_MONTHS } from '@/lib/constants/retention';
import { requireAdminPage } from '@/server/auth/guards';

export const metadata: Metadata = { title: 'Données clients' };
export const dynamic = 'force-dynamic';

export default async function AdminCustomerDataPage() {
  const admin = await requireAdminPage();

  if (admin.role !== 'OWNER') {
    return (
      <main>
        <div className="page-head">
          <h1>Données clients</h1>
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
        <h1>Données clients</h1>
      </div>
      <div className="card" style={{ maxWidth: '40rem' }}>
        <h2>Effacer les données d’un client</h2>
        <p className="help-text" style={{ marginBottom: 'var(--space-4)' }}>
          À utiliser quand un client demande la suppression de ses données. Son nom, son téléphone, son email, son adresse
          et les messages et notes de ses commandes sont effacés. Les commandes restent dans vos comptes avec leurs
          montants, leurs articles et leurs dates, sans rien qui permette d’identifier la personne. Un client qui a une
          commande en cours (ni livrée ni annulée) ne peut pas être effacé : terminez ou annulez d’abord la commande.
        </p>
        <AnonymizeCustomerForm />
      </div>
      <p className="help-text" style={{ marginTop: 'var(--space-4)', maxWidth: '40rem' }}>
        Sans demande, les données d’un client sont conservées {CUSTOMER_RETENTION_MONTHS} mois après sa dernière commande
        (durée proposée, en cours de validation). L’effacement automatique n’est actif que si vous l’avez activé.
      </p>
    </main>
  );
}
