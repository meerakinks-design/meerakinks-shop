'use client';

import type { MouseEvent, ReactNode } from 'react';
import { openModal } from '@/lib/shop/modal-state';

interface ModalLinkProps {
  hash: string;
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
  /** Identifiant de bouton pour l'analytique maison (liste fermée `TRACK_TARGETS`). */
  'data-track'?: string;
  onNavigate?: () => void;
}

/** Lien qui ouvre un modal. Sans JavaScript, c'est un simple lien vers l'ancre. */
export function ModalLink({ hash, className, children, onNavigate, ...rest }: ModalLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate?.();
    openModal(hash);
  }
  return (
    <a href={hash} className={className} onClick={handleClick} aria-haspopup="dialog" aria-label={rest['aria-label']} data-track={rest['data-track']}>
      {children}
    </a>
  );
}
