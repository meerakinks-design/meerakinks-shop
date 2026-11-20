'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { notifyModalChange } from '@/lib/shop/modal-state';

/**
 * Les modals sont portés par l'ancre de l'adresse (#panier, #commande…). Quand le routeur change de page, l'ancre
 * disparaît sans événement du navigateur : on prévient les modals pour qu'ils se ferment (ex. après l'envoi d'une
 * commande, la page de confirmation s'affiche sans modal resté ouvert par-dessus).
 */
export function ModalRouteSync() {
  const pathname = usePathname();
  useEffect(() => {
    notifyModalChange();
  }, [pathname]);
  return null;
}
