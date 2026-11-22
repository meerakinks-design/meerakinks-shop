'use client';

import { gsap } from 'gsap';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { MODAL_HASHES, PUBLIC_ROUTES } from '@/lib/constants/routes';
import { prefersReducedMotion } from '@/lib/shop/motion';
import { useCart } from './CartProvider';
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
 * Menu en modal (référence « m_e_n_u » : menu à panneaux décalés).
 * Deux rideaux de couleur glissent depuis la droite, puis le panneau beige ; les liens montent un à un.
 * C'est un <dialog> natif porté par l'ancre #menu, comme le panier : focus piégé, Échap, bouton Retour du téléphone.
 */
export function MenuModal({ storeName, showCollections, showContact, socials }: MenuModalProps) {
  const { isOpen, close } = useModal(MODAL_HASHES.menu);
  const { hydrated, itemCount } = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const count = hydrated ? itemCount : 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const q = (selector: string) => Array.from(dialog.querySelectorAll<HTMLElement>(selector));
    timeline.current?.kill();

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      if (prefersReducedMotion()) {
        gsap.set(dialog.querySelectorAll('.menu-layer, .menu-panel, .menu-item-label, .menu-social'), { clearProps: 'all' });
        return;
      }
      const layers = q('.menu-layer');
      const panel = dialog.querySelector<HTMLElement>('.menu-panel');
      const labels = q('.menu-item-label');
      const socialsEls = q('.menu-social');
      const tl = gsap.timeline();
      gsap.set(labels, { yPercent: 140, rotate: 8 });
      gsap.set(socialsEls, { y: 24, opacity: 0 });
      layers.forEach((layer, i) => tl.fromTo(layer, { xPercent: 100 }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07));
      const start = layers.length * 0.07 + 0.02;
      if (panel) tl.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0.6, ease: 'power4.out' }, start);
      tl.to(labels, { yPercent: 0, rotate: 0, duration: 0.9, ease: 'power4.out', stagger: 0.08 }, start + 0.12);
      tl.to(socialsEls, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.07, clearProps: 'opacity,transform' }, start + 0.3);
      timeline.current = tl;
    } else if (dialog.open) {
      if (prefersReducedMotion()) {
        dialog.close();
        return;
      }
      const targets = [...q('.menu-layer'), dialog.querySelector<HTMLElement>('.menu-panel')].filter(Boolean) as HTMLElement[];
      timeline.current = gsap.timeline({ onComplete: () => dialog.close() }).to(targets, { xPercent: 100, duration: 0.32, ease: 'power3.in' });
    }
    return () => {
      timeline.current?.kill();
    };
  }, [isOpen]);

  const linkProps = { onClick: close };

  return (
    <dialog
      ref={dialogRef}
      className="menu-dialog"
      aria-label="Menu"
      onCancel={(event) => {
        event.preventDefault(); // Échap : par l'historique, comme le bouton Retour
        close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
    >
      <div className="menu-layer menu-layer-1" aria-hidden="true" />
      <div className="menu-layer menu-layer-2" aria-hidden="true" />
      <div className="menu-panel">
        <div className="menu-top">
          <span className="menu-brand">{storeName}</span>
          <button type="button" className="menu-close" onClick={close} aria-label="Fermer le menu">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

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
              <ModalLink hash={MODAL_HASHES.story} className="menu-item">
                <span className="menu-item-label">Notre histoire</span>
              </ModalLink>
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
              <li key={social.label}>
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
      </div>
    </dialog>
  );
}
