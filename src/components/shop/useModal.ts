'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { closeModal, getOpenModal, openModal, subscribeToModals } from '@/lib/shop/modal-state';

/** État d'un modal porté par l'adresse (#panier…). Côté serveur : toujours fermé. */
export function useModal(hash: string) {
  const current = useSyncExternalStore(subscribeToModals, getOpenModal, () => '');
  const open = useCallback(() => openModal(hash), [hash]);
  const close = useCallback(() => closeModal(hash), [hash]);
  return { isOpen: current === hash, open, close };
}
