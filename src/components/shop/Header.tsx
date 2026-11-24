'use client';

import Link from 'next/link';
import { cld } from '@/lib/cloudinary-static';
import { MODAL_HASHES, PUBLIC_ROUTES } from '@/lib/constants/routes';
import { formatFcfa } from '@/lib/money';
import { useCart } from './CartProvider';
import { ModalLink } from './ModalLink';

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M4 9h16M4 15h16" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M3 10h18l-1.8 9.2a1.5 1.5 0 0 1-1.5 1.3H6.3a1.5 1.5 0 0 1-1.5-1.3L3 10Z" />
      <path d="M8 10l3-5M16 10l-3-5" />
      <path d="M9 14v3M12 14v3M15 14v3" />
    </svg>
  );
}

/**
 * En-tête (référence Bucks Sauce) : logo à gauche, bouton « Commander » (mène au catalogue), icône du panier avec le nombre d'articles
 * en badge, et bouton menu. Même disposition sur téléphone et sur ordinateur. Le menu et le panier sont des modals.
 * Le total est une estimation : le montant officiel est calculé par le serveur à l'ouverture du panier.
 */
interface HeaderProps {
  storeName: string;
}

export function Header({ storeName }: HeaderProps) {
  const { hydrated, itemCount, estimatedTotal } = useCart();
  const count = hydrated ? itemCount : 0;
  const total = hydrated && count > 0 && estimatedTotal !== null ? estimatedTotal : null;
  const cartLabel = count === 0 ? 'Panier : vide' : `Panier : ${count} article${count > 1 ? 's' : ''}${total !== null ? `, ${formatFcfa(total)}` : ''}`;

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href={PUBLIC_ROUTES.home} className="brand" aria-label={`${storeName} — accueil`}>
          <img src={cld('/brand/logo-meera-kinks.png', { width: 400 })} alt={storeName} className="brand-logo" width={133} height={52} />
        </Link>

        <div className="header-actions">
          <Link className="header-shop" href={PUBLIC_ROUTES.shop}>
            Commander
          </Link>

          <ModalLink hash={MODAL_HASHES.cart} className="header-icon-btn cart-button" aria-label={cartLabel}>
            <CartIcon />
            {count > 0 && (
              <span key={count} className="cart-badge" aria-hidden="true">
                {count}
              </span>
            )}
          </ModalLink>

          <ModalLink hash={MODAL_HASHES.menu} className="header-icon-btn menu-toggle" aria-label="Ouvrir le menu">
            <MenuIcon />
          </ModalLink>
        </div>
      </div>
    </header>
  );
}
