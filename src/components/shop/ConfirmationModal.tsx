'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ORDER_THANKS } from '@/content/livraison';
import { MODAL_HASHES } from '@/lib/constants/routes';
import { getConfirmedOrderRaw, parseConfirmedOrder, subscribeConfirmedOrder } from '@/lib/shop/confirmed-order';
import { CurtainModal } from './CurtainModal';
import { OrderConfirmation } from './OrderConfirmation';
import { useModal } from './useModal';

/**
 * Confirmation de commande en modal, à droite, comme le panier et la commande. Elle s'ouvre toute seule juste après
 * l'enregistrement (la commande vient de la réponse du serveur, gardée dans l'onglet). Le reçu « imprimé » n'est monté
 * qu'à la première ouverture : l'animation de l'imprimante et le téléchargement du reçu se jouent sous les yeux du client.
 * La page /commande/confirmation?ref=… reste disponible pour un lien direct.
 */
export function ConfirmationModal({ depositAmount, storeName }: { depositAmount: number; storeName: string }) {
  const { isOpen, dismiss } = useModal(MODAL_HASHES.confirmation);
  const raw = useSyncExternalStore(subscribeConfirmedOrder, () => getConfirmedOrderRaw(), () => null);
  const order = useMemo(() => parseConfirmedOrder(raw), [raw]);
  // Le contenu reste monté après la première ouverture : il ne disparaît pas pendant que le panneau repart vers la droite.
  const [everOpened, setEverOpened] = useState(false);
  useEffect(() => {
    if (isOpen) setEverOpened(true);
  }, [isOpen]);

  return (
    <CurtainModal hash={MODAL_HASHES.confirmation} title={ORDER_THANKS} closeLabel="Fermer la confirmation" dismissInPlace className="modal-confirmation">
      {everOpened && order ? (
        <OrderConfirmation key={order.reference} order={order} depositAmount={depositAmount} storeName={storeName} variant="modal" onContinue={dismiss} />
      ) : isOpen ? (
        <div className="empty-state" role="status">
          <p>Nous ne retrouvons pas votre commande sur cet appareil. Si vous l’avez envoyée, l’équipe vous contacte sur WhatsApp.</p>
        </div>
      ) : null}
    </CurtainModal>
  );
}
