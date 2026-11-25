'use client';

import Link from 'next/link';
import { MODAL_HASHES, PUBLIC_ROUTES } from '@/lib/constants/routes';
import type { SocialLink } from '@/lib/shop/socials';
import { useCart } from './CartProvider';
import { CurtainModal } from './CurtainModal';
import { ModalLink } from './ModalLink';
import { SocialIcon } from './SocialIcons';
import { useModal } from './useModal';

interface MenuModalProps {
  storeName: string;
  showCollections: boolean;
  showContact: boolean;
  socials: readonly SocialLink[];
}

/**
 * Menu en modal : même mécanisme que le panier, la commande et la confirmation (CurtainModal) : deux rideaux de
 * couleur glissent depuis la droite, puis le panneau beige ; les liens montent un à un. Le panneau reste collé à droite
 * sur ordinateur, et occupe tout l'écran sur téléphone. Au pied du menu : les icônes WhatsApp, Instagram, TikTok et Facebook.
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
            <li key={social.name} data-rise="">
              <a className="menu-social" href={social.href} aria-label={social.label} target="_blank" rel="noopener noreferrer">
                <SocialIcon name={social.name} size={26} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </CurtainModal>
  );
}
