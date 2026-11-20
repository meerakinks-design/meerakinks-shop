// Règles d'affichage des produits : prix facturé, promotion, badge « Nouveau », disponibilité.

export const NEW_PRODUCT_DAYS = 30;
export const MAX_QUANTITY_PER_LINE = 20;

interface Priced {
  price: number;
  salePrice: number | null;
}

export const hasPromotion = (product: Priced): boolean => product.salePrice !== null && product.salePrice < product.price;

/** RM-02 : le client paie le prix promotionnel s'il existe (et reste inférieur au prix normal), sinon le prix. */
export const effectivePrice = (product: Priced): number => (hasPromotion(product) ? (product.salePrice as number) : product.price);

export function discountPercent(product: Priced): number | null {
  if (!hasPromotion(product)) return null;
  return Math.round((1 - (product.salePrice as number) / product.price) * 100);
}

/** RM-39 : « Nouveau » = première publication il y a 30 jours ou moins. Jamais de date future. */
export function isNewProduct(publishedAt: Date | string | null, now: Date = new Date()): boolean {
  if (!publishedAt) return false;
  const published = new Date(publishedAt).getTime();
  const elapsedDays = (now.getTime() - published) / 86_400_000;
  return elapsedDays >= 0 && elapsedDays <= NEW_PRODUCT_DAYS;
}

/** null = stock non suivi : jamais « épuisé ». */
export const isOutOfStock = (stock: number | null): boolean => stock !== null && stock <= 0;

/** Quantité maximale commandable pour une ligne. */
export const maxOrderableQuantity = (stock: number | null): number =>
  stock === null ? MAX_QUANTITY_PER_LINE : Math.max(0, Math.min(stock, MAX_QUANTITY_PER_LINE));
