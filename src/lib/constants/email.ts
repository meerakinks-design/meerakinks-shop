// Libellés des emails automatiques (table EmailNotification) pour le back-office. Les types « NEW_VISITOR » n'ont pas de commande.
export const ORDER_EMAIL_TYPE_LABELS = {
  NEW_ORDER_SELLER: 'Alerte « nouvelle commande » (boutique)',
  ORDER_RECEIVED_CUSTOMER: 'Accusé de réception (cliente)',
  STATUS_CHANGED_CUSTOMER: 'Changement de statut (cliente)',
} as const;

export const EMAIL_STATUS_LABELS = {
  PENDING: 'En attente d’envoi',
  PROCESSING: 'Envoi en cours',
  SENT: 'Envoyé',
  FAILED: 'Abandonné',
} as const;

export type EmailStatusValue = keyof typeof EMAIL_STATUS_LABELS;

export const emailTypeLabel = (type: string): string => (ORDER_EMAIL_TYPE_LABELS as Record<string, string>)[type] ?? 'Email automatique';
