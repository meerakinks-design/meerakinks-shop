import Link from 'next/link';
import { ADMIN_PASSWORD_PATH } from '@/lib/constants/auth';
import { ADMIN_ORDERS_EXPORT_PATH } from '@/lib/constants/orders-export';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import { ADMIN_CUSTOMER_DATA_PATH } from '@/lib/constants/retention';
import { LogoutButton } from './LogoutButton';

interface AdminAccountProps {
  name: string;
  isOwner: boolean;
}

/** Nom du compte, liens d'administration et déconnexion : affiché dans le menu latéral (ordinateur) et dans le rideau du compte (téléphone). */
export function AdminAccount({ name, isOwner }: AdminAccountProps) {
  return (
    <div className="admin-account">
      <p className="admin-account-name">
        {name}
        <span className="admin-account-role">{isOwner ? 'Propriétaire' : 'Équipe'}</span>
      </p>
      <ul className="admin-account-links">
        <li>
          <Link href={PUBLIC_ROUTES.home} target="_blank" rel="noopener noreferrer">
            Voir la boutique
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
            </svg>
            <span className="visually-hidden">(s’ouvre dans un nouvel onglet)</span>
          </Link>
        </li>
        {isOwner && (
          <li>
            <Link href={ADMIN_ORDERS_EXPORT_PATH}>Export des commandes</Link>
          </li>
        )}
        {isOwner && (
          <li>
            <Link href={ADMIN_CUSTOMER_DATA_PATH}>Données clients</Link>
          </li>
        )}
        <li>
          <Link href={ADMIN_PASSWORD_PATH}>Mot de passe</Link>
        </li>
      </ul>
      <LogoutButton />
    </div>
  );
}
