'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useModal } from './useModal';

interface ModalProps {
  hash: string;
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Modal natif <dialog> : focus piégé, fond inerte, Échap et retour du focus gérés par le navigateur.
 * Il reste dans le HTML même fermé (le contenu de « Notre histoire » est donc indexable).
 */
export function Modal({ hash, title, children, className = '' }: ModalProps) {
  const { isOpen, close } = useModal(hash);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className={`modal ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault(); // Échap : on passe par l'historique, comme le bouton Retour
        close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) close(); // clic sur le fond
      }}
    >
      <div className="modal-panel">
        <header className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="modal-close" onClick={close} aria-label="Fermer">
            <span aria-hidden="true">✕</span>
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </dialog>
  );
}
