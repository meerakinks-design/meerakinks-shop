'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MODAL_HASHES, PUBLIC_ROUTES } from '@/lib/constants/routes';
import { formatFcfa } from '@/lib/money';
import { useCart } from './CartProvider';
import { ModalLink } from './ModalLink';

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M6 7h12l-1.2 12H7.2L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

/**
 * En-tête (document de la landing §1). Sur mobile : logo à gauche, icône du panier (badge du nombre d'articles)
 * et menu hamburger à droite, dans la barre. Sur ordinateur : navigation au centre et panier avec son montant.
 * Le montant est une estimation : le total officiel est calculé par le serveur à l'ouverture du panier.
 */
interface HeaderProps {
  storeName: string;
  /** Le lien « Collections » n'existe que si la section existe (au moins une catégorie active avec un produit publié). */
  showCollections: boolean;
  /** Idem pour « Contact » : au moins un moyen de contact confirmé dans les paramètres. */
  showContact: boolean;
}

export function Header({ storeName, showCollections, showContact }: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { hydrated, itemCount, estimatedTotal } = useCart();

  const count = hydrated ? itemCount : 0;
  const total = hydrated && count > 0 && estimatedTotal !== null ? estimatedTotal : null;
  const cartLabel = count === 0 ? 'Panier : vide' : `Panier : ${count} article${count > 1 ? 's' : ''}${total !== null ? `, ${formatFcfa(total)}` : ''}`;
  const current = (href: string) => (pathname === href || (href !== '/' && pathname.startsWith(`${href}/`)) ? ('page' as const) : undefined);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href={PUBLIC_ROUTES.home} className="brand" aria-label={`${storeName} — accueil`}>
          {storeName}
        </Link>

        <nav aria-label="Navigation principale" className="main-nav">
          <Link href={PUBLIC_ROUTES.shop} aria-current={current(PUBLIC_ROUTES.shop)}>
            Boutique
          </Link>
          {showCollections && <Link href="/#collections">Collections</Link>}
          <ModalLink hash={MODAL_HASHES.story}>Notre histoire</ModalLink>
          {showContact && <Link href="/#contact">Contact</Link>}
        </nav>

        <div className="header-actions">
          <Link className="btn btn-quiet header-shop" href={PUBLIC_ROUTES.shop}>
            Voir la boutique
          </Link>

          <ModalLink hash={MODAL_HASHES.cart} className="cart-button" aria-label={cartLabel}>
            <CartIcon />
            <span className="cart-label">Mon panier</span>
            {count > 0 && (
              <span key={count} className="cart-badge" aria-hidden="true">
                {count}
              </span>
            )}
            {total !== null && (
              <span className="cart-total" aria-hidden="true">
                {formatFcfa(total)}
              </span>
            )}
          </ModalLink>

          <button type="button" className="menu-toggle" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen((open) => !open)}>
            <span className="visually-hidden">{menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      <nav id="mobile-menu" aria-label="Menu mobile" className="mobile-menu" hidden={!menuOpen}>
        <Link href={PUBLIC_ROUTES.shop} onClick={() => setMenuOpen(false)}>
          Boutique
        </Link>
        {showCollections && (
          <Link href="/#collections" onClick={() => setMenuOpen(false)}>
            Collections
          </Link>
        )}
        <ModalLink hash={MODAL_HASHES.story} onNavigate={() => setMenuOpen(false)}>
          Notre histoire
        </ModalLink>
        {showContact && (
          <Link href="/#contact" onClick={() => setMenuOpen(false)}>
            Contact
          </Link>
        )}
        <ModalLink hash={MODAL_HASHES.cart} onNavigate={() => setMenuOpen(false)}>
          Mon panier{count > 0 ? ` (${count})` : ''}
        </ModalLink>
      </nav>
    </header>
  );
}
