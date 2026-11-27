'use client';

import { gsap } from 'gsap';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/lib/shop/motion';
import { useModal } from './useModal';

interface CurtainModalProps {
  /** Ancre qui porte l'état du modal (#menu, #panier, #commande, #confirmation). */
  hash: string;
  /** Titre affiché dans l'en-tête ; sert aussi de nom accessible quand `ariaLabel` est absent. */
  title: string;
  /** Nom accessible de la boîte de dialogue, si différent du titre affiché (ex. « Menu »). */
  ariaLabel?: string;
  /** Texte du bouton de fermeture (lecteurs d'écran). */
  closeLabel?: string;
  /** Logo de la marque affiché à GAUCHE de l'en-tête (menu, panier) à la place du titre ; le titre reste dans le HTML, masqué à l'écran. */
  logoSrc?: string;
  /** Nom de la marque : texte alternatif du logo. Le logo n'est pas un lien : le focus reste sur ✕ à l'ouverture. */
  logoLabel?: string;
  /** Fermer en retirant l'ancre sur place (sans reculer dans l'historique) : utilisé par la confirmation de commande. */
  dismissInPlace?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Modal « rideaux » : LE mécanisme commun du menu, du panier, de la commande et de la confirmation.
 * Deux rideaux de couleur glissent depuis la DROITE, puis le panneau beige ; ensuite les éléments marqués
 * `data-rise` (et les libellés de lien du menu) montent un à un. À la fermeture, tout repart vers la droite.
 *
 * Sur téléphone, le panneau occupe TOUT l'écran (voir `--drawer-w` et la requête max-width: 699px dans ui.css) ; on le
 * referme avec ✕ ou Retour. Sur ordinateur, il reste collé à droite, largeur fixe, avec le site dimmé derrière.
 *
 * C'est un <dialog> natif porté par l'ancre : focus piégé, fond inerte, Échap et bouton Retour du téléphone.
 * Le contenu reste dans le HTML même fermé. Mouvement réduit : ouverture et fermeture instantanées.
 */
export function CurtainModal({ hash, title, ariaLabel, closeLabel = 'Fermer', logoSrc, logoLabel, dismissInPlace = false, className = '', children }: CurtainModalProps) {
  const modal = useModal(hash);
  const { isOpen } = modal;
  const close = dismissInPlace ? modal.dismiss : modal.close;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const all = (selector: string) => Array.from(dialog.querySelectorAll<HTMLElement>(selector));
    timeline.current?.kill();

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
        // showModal() donne le focus à un élément du panneau. Dès la 2e ouverture, rideaux et panneau sont encore rangés hors
        // écran (à droite) : le navigateur fait alors défiler le <dialog> (overflow: hidden) jusqu'au bouton ✕, ce qui annule
        // le glissement (panneau déjà en place, rideaux qui partent à gauche). On remet donc le défilement à zéro, et le CSS
        // utilise `overflow: clip` (aucun défilement possible) : les rideaux rejouent à CHAQUE ouverture et fermeture.
        dialog.scrollLeft = 0;
        dialog.scrollTop = 0;
      }
      if (prefersReducedMotion()) {
        gsap.set(dialog.querySelectorAll('.curtain-layer, .curtain-panel, .menu-item-label, [data-rise]'), { clearProps: 'all' });
        return;
      }
      const layers = all('.curtain-layer');
      const panel = dialog.querySelector<HTMLElement>('.curtain-panel');
      const labels = all('.menu-item-label');
      const rises = all('[data-rise]');
      const tl = gsap.timeline();
      gsap.set(labels, { yPercent: 140, rotate: 8 });
      gsap.set(rises, { y: 34, opacity: 0 });
      layers.forEach((layer, index) => tl.fromTo(layer, { xPercent: 100 }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, index * 0.07));
      const start = layers.length * 0.07 + 0.02;
      if (panel) tl.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0.6, ease: 'power4.out' }, start);
      // Les liens du menu montent depuis le bas de leur ligne ; les autres éléments (lignes du panier, champs…) montent en fondu.
      tl.to(labels, { yPercent: 0, rotate: 0, duration: 0.9, ease: 'power4.out', stagger: 0.08 }, start + 0.12);
      tl.to(rises, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.07, clearProps: 'opacity,transform' }, start + 0.2);
      timeline.current = tl;
    } else if (dialog.open) {
      if (prefersReducedMotion()) {
        dialog.close();
        return;
      }
      const layers = all('.curtain-layer');
      const panel = dialog.querySelector<HTMLElement>('.curtain-panel');
      const tl = gsap.timeline({ onComplete: () => dialog.close() });
      // Sortie inverse de l'entrée : le panneau part en premier, puis les rideaux, vers la droite.
      if (panel) tl.to(panel, { xPercent: 100, duration: 0.34, ease: 'power3.in' }, 0);
      [...layers].reverse().forEach((layer, index) => tl.to(layer, { xPercent: 100, duration: 0.34, ease: 'power3.in' }, 0.05 + index * 0.05));
      timeline.current = tl;
    }
    return () => {
      timeline.current?.kill();
    };
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className={`curtain-dialog ${className}`.trim()}
      {...(ariaLabel ? { 'aria-label': ariaLabel } : { 'aria-labelledby': titleId })}
      onCancel={(event) => {
        event.preventDefault(); // Échap : on passe par l'historique, comme le bouton Retour
        close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) close(); // toucher le site dimmé (ordinateur : à gauche du panneau) referme
      }}
    >
      <div className="curtain-layer curtain-layer-1" aria-hidden="true" />
      <div className="curtain-layer curtain-layer-2" aria-hidden="true" />
      <div className="curtain-panel">
        <header className="curtain-head">
          {logoSrc && (
            <span className="curtain-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt={logoLabel ?? ''} width={133} height={52} />
            </span>
          )}
          <h2 id={titleId} className={`curtain-title${logoSrc ? ' visually-hidden' : ''}`}>
            {title}
          </h2>
          <button type="button" className="curtain-close" onClick={close} aria-label={closeLabel}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="curtain-body">{children}</div>
      </div>
    </dialog>
  );
}
