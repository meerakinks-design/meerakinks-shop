'use client';

import Link from 'next/link';
import { MODAL_HASHES, PUBLIC_ROUTES } from '@/lib/constants/routes';
import { useCart } from './CartProvider';
import { CurtainModal } from './CurtainModal';
import { ModalLink } from './ModalLink';
import { useModal } from './useModal';

export interface MenuSocial {
  label: string;
  href: string;
}

interface MenuModalProps {
  storeName: string;
  showCollections: boolean;
  showContact: boolean;
  socials: readonly MenuSocial[];
}

/**
 * Menu en modal : même mécanisme que le panier, la commande et la confirmation (CurtainModal) : deux rideaux de
 * couleur glissent depuis la droite, puis le panneau beige ; les liens montent un à un. Le panneau reste collé à droite
 * sur ordinateur, et laisse une bande du site visible à gauche sur téléphone.
 */
export function MenuModal({ storeName, showCollections, showContact, socials }: MenuModalProps) {
  const { close } = useModal(MODAL_HASHES.menu);
  const { hydrated, itemCount } = useCart();
  const count = hydrated ? itemCount : 0;
  const linkProps = { onClick: close };

  return (
    <CurtainModal hash={MODAL_HASHES.menu} title={storeName} brandTitle ariaLabel="Menu" closeLabel="Fermer le menu" className="menu-dialog">
      <nav aria-label="Menu principal">
        <ul className="menu-list">
          <li className="menu-item-wrap">
            <Link className="menu-item" href={PUBLIC_ROUTES.shop} {...linkProps}>
              <span className="menu-item-label">Boutique</span>
            </Link>
          </li>
          {showCollections && (
            <li className="menu-item-wrap">
              <Link className="menu-item" href="/#collections" {...linkProps}>
                <span className="menu-item-label">Collections</span>
              </Link>
            </li>
          )}
          <li className="menu-item-wrap">
            <Link className="menu-item" href={PUBLIC_ROUTES.about} {...linkProps}>
              <span className="menu-item-label">Notre histoire</span>
            </Link>
          </li>
          {showContact && (
            <li className="menu-item-wrap">
              <Link className="menu-item" href="/#contact" {...linkProps}>
                <span className="menu-item-label">Contact</span>
              </Link>
            </li>
          )}
          <li className="menu-item-wrap">
            <ModalLink hash={MODAL_HASHES.cart} className="menu-item">
              <span className="menu-item-label">Mon panier{count > 0 ? ` (${count})` : ''}</span>
            </ModalLink>
          </li>
        </ul>
      </nav>

      {socials.length > 0 && (
        <ul className="menu-socials" aria-label="Réseaux sociaux">
          {socials.map((social) => (
            <li key={social.label} data-rise="">
              <a className="menu-social" href={social.href} target="_blank" rel="noopener noreferrer">
                <span>{social.label}</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="M7 17L17 7M9 7h8v8" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      )}
    </CurtainModal>
  );
}
