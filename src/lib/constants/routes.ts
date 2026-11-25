// Adresses publiques du site : une seule source de vérité (liens, sitemap, rafraîchissement du cache).
// Le menu, le panier, la commande et la confirmation sont des MODALS qui entrent par la droite : ils n'ont pas de page
// propre, seulement une ancre (#panier…) pour que le bouton Retour du téléphone les ferme au lieu de quitter le site.
// « Notre histoire » est la page dédiée /a-propos (ce n'est plus un modal).
// La boutique n'est plus une page : le catalogue est une section de la landing (ancre #boutique, juste après la section « guide »).
// L'ancienne adresse /boutique (avec ses filtres) est redirigée vers elle par next.config.mjs.

export const PUBLIC_ROUTES = {
  home: '/',
  shop: '/#boutique',
  categories: '/categories',
  about: '/a-propos',
  credits: '/credits',
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
  confirmation: '#confirmation',
  menu: '#menu',
} as const;

export const productPath = (slug: string) => `/produit/${slug}`;
export const categoryPath = (slug: string) => `/categorie/${slug}`;
export const orderConfirmationPath = (reference: string) =>
  `${PUBLIC_ROUTES.orderConfirmation}?ref=${encodeURIComponent(reference)}`;
