// Pastilles de réassurance de la fiche produit. Chaque ligne reprend une règle déjà validée
// (annexe B du cahier, content/livraison.ts) ou une fonctionnalité réellement livrée : rien d'inventé
// (pas de délai, pas de garantie, pas de promesse de paiement).

export type ProductBadgeIcon = 'whatsapp' | 'wallet' | 'delivery' | 'receipt';

export const PRODUCT_BADGES: ReadonlyArray<{ icon: ProductBadgeIcon; label: string }> = [
  { icon: 'whatsapp', label: 'Confirmation sur WhatsApp' },
  { icon: 'wallet', label: 'Paiement à la livraison à Abidjan' },
  { icon: 'delivery', label: 'Livraison en Côte d’Ivoire et à l’étranger' },
  { icon: 'receipt', label: 'Reçu à chaque commande' },
];

export const PRODUCT_TEXT = {
  features: 'Caractéristiques',
  usage: 'Mode d’utilisation',
  story: 'À propos de ce produit',
  paymentDelivery: 'Paiement et livraison',
  quantity: 'Quantité',
  add: 'Ajouter au panier',
  added: 'Ajouté ✓',
  stickyAdd: 'Ajouter',
  outOfStock: 'Ce produit est épuisé pour le moment.',
} as const;
