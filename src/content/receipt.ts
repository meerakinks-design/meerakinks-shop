import type { ZoneTypeValue } from '@/lib/constants/order';

// Textes du reçu de commande (ticket de caisse téléchargeable en PNG) et de son animation.
// Règles du cahier : un paiement n'est JAMAIS présenté comme reçu (RM-10, RM-25) et le pied du reçu
// rappelle que ce n'est pas une facture (P-35, RM-26). Les modalités de paiement et les étapes
// suivantes viennent de content/livraison.ts : une seule source (RM-41).

export const RECEIPT_TEXT = {
  title: 'REÇU DE COMMANDE',
  referenceLabel: 'Commande',
  deliveryLabel: 'Livraison',
  subtotalLabel: 'Sous-total',
  deliveryFeeLabel: 'Frais de livraison',
  totalLabel: 'TOTAL',
  toConfirm: 'à confirmer',
  stamp: 'PAIEMENT NON REÇU',
  stampNote: 'Commande enregistrée, en attente de confirmation.',
  /** P-35, mot pour mot. */
  footer: 'Reçu de commande — ne constitue pas une facture.',
  /** Marque affichée si le nom de la boutique n'est pas transmis. */
  fallbackShopName: 'Ma commande',
  section: 'Votre reçu de commande',
  downloadCta: 'Télécharger mon reçu (PNG)',
  downloaded: 'Votre reçu a été téléchargé sur votre appareil.',
  downloadHint: 'Gardez-le : il rappelle votre référence et le détail de votre commande.',
  failed: 'Le reçu n’a pas pu être généré. Le récapitulatif ci-dessous reste valable : gardez votre référence.',
  statuses: {
    processing: 'Préparation de votre reçu',
    printing: 'Impression de votre reçu',
    complete: 'Reçu prêt',
  },
} as const;

/** Même libellé que le récapitulatif de la page (OrderTotals) : le reçu ne peut pas le contredire. */
export const upfrontLabel = (zoneType: ZoneTypeValue): string => (zoneType === 'ABIDJAN' ? 'Acompte pour confirmer' : 'À régler avant expédition');
