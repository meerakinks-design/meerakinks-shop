// Libellés français des statuts. Les valeurs (clés) sont celles des enums Prisma ;
// un test vérifie qu'aucune valeur n'est oubliée quand le schéma évolue.

export const DELIVERY_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
export type DeliveryStatusValue = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatusValue, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  SHIPPED: 'En livraison',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

export const PAYMENT_STATUSES = ['TO_CONFIRM', 'DEPOSIT_DUE', 'DEPOSIT_PAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'CANCELLED'] as const;
export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusValue, string> = {
  TO_CONFIRM: 'À confirmer',
  DEPOSIT_DUE: 'Acompte attendu',
  DEPOSIT_PAID: 'Acompte reçu',
  PARTIALLY_PAID: 'Paiement partiel',
  PAID: 'Paiement intégral reçu',
  REFUNDED: 'Remboursé',
  CANCELLED: 'Annulé',
};

/**
 * Passages autorisés pour la livraison. On avance d'une étape à la fois ; on peut annuler tant que
 * la commande n'est pas livrée. Une commande livrée ou annulée est définitive : une erreur se
 * corrige par une nouvelle commande, pas en rouvrant l'ancienne.
 */
export const DELIVERY_TRANSITIONS: Record<DeliveryStatusValue, readonly DeliveryStatusValue[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransitionDelivery(from: DeliveryStatusValue, to: DeliveryStatusValue): boolean {
  return DELIVERY_TRANSITIONS[from].includes(to);
}
