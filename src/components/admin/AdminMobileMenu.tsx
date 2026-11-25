'use client';

import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface AdminMobileMenuProps {
  /** Première lettre du nom du compte, affichée dans le bouton rond. */
  initial: string;
  /** Contenu du rideau : nom, liens du compte et déconnexion (rendu côté serveur). */
  children: ReactNode;
}

/**
 * Menu du compte pour téléphone et tablette : même mécanisme que le menu de la vitrine (rideaux de couleur qui glissent
 * depuis la droite, panneau beige). <dialog> natif : focus piégé, Échap ferme, le reste de la page est inerte.
 */
export function AdminMobileMenu({ initial, children }: AdminMobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Un clic sur un lien change de page : le rideau se referme tout seul.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const close = () => dialogRef.current?.close();

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    // Clic hors du panneau (sur la zone assombrie) : fermeture.
    if (event.target === event.currentTarget) close();
  }

  function handlePanelClick(event: MouseEvent<HTMLDivElement>) {
    // Lien qui ne change pas de page (ouverture de la boutique dans un autre onglet) : on referme aussi.
    if ((event.target as HTMLElement).closest('a')) close();
  }

  return (
    <>
      <button type="button" className="admin-account-btn" aria-haspopup="dialog" aria-label="Ouvrir le menu du compte" onClick={() => dialogRef.current?.showModal()}>
        <span aria-hidden="true">{initial}</span>
      </button>

      {/* Le clic sur la zone assombrie est un confort à la souris ; le clavier ferme avec Échap ou le bouton ✕. */}
      <dialog ref={dialogRef} className="admin-sheet" aria-label="Menu du compte" onClick={handleDialogClick}>
        <div className="admin-sheet-layer admin-sheet-layer-1" aria-hidden="true" />
        <div className="admin-sheet-layer admin-sheet-layer-2" aria-hidden="true" />
        <div className="admin-sheet-panel" onClick={handlePanelClick}>
          <div className="admin-sheet-head">
            <p className="admin-sheet-title">Mon compte</p>
            <button type="button" className="admin-sheet-close" aria-label="Fermer le menu" onClick={close}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
