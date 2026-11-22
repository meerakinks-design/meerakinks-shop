// Adresses publiques du site : une seule source de vérité (liens, sitemap, rafraîchissement du cache).
// Le panier, la commande et « Notre histoire » sont des MODALS : ils n'ont pas de page, seulement une
// ancre (#panier…) pour que le bouton Retour du téléphone les ferme au lieu de quitter le site.

export const PUBLIC_ROUTES = {
  home: '/',
  shop: '/boutique',
  categories: '/categories',
  orderConfirmation: '/commande/confirmation',
  cgv: '/cgv',
  cgu: '/cgu',
  legalNotice: '/mentions-legales',
  privacy: '/politique-de-confidentialite',
  cookies: '/cookies',
} as const;

export const MODAL_HASHES = {
  cart: '#panier',
  checkout: '#commande',
  story: '#notre-histoire',
  menu: '#menu',
} as const;

export const productPath = (slug: string) => `/produit/${slug}`;
export const categoryPath = (slug: string) => `/categorie/${slug}`;
export const orderConfirmationPath = (reference: string) =>
  `${PUBLIC_ROUTES.orderConfirmation}?ref=${encodeURIComponent(reference)}`;
