import { MAX_QUANTITY_PER_LINE, effectivePrice, hasPromotion, isOutOfStock, maxOrderableQuantity } from '@/lib/shop/product-display';
import type { CartQuote, QuoteLine } from '@/lib/shop/quote-types';
import { computeSubtotal, lineTotal } from '@/server/services/pricing';
import type { QuoteRequestItem } from '@/server/services/quote.service';
import { findProduct, imageUrl } from '../fixtures';

export type { CartQuote, QuoteLine };
export type { QuoteLineStatus } from '@/lib/shop/quote-types';
export type { QuoteRequestItem };

// Même logique que le vrai service (src/server/services/quote.service.ts), lue dans les données de démonstration.
export async function quoteCart(items: readonly QuoteRequestItem[]): Promise<CartQuote> {
  const requested = new Map<string, number>();
  for (const item of items) requested.set(item.productId, Math.min((requested.get(item.productId) ?? 0) + item.quantity, MAX_QUANTITY_PER_LINE));
  const lines: QuoteLine[] = [...requested].map(([productId, requestedQuantity]) => {
    const product = findProduct(productId);
    if (!product) {
      return { productId, variantId: null, variantLabel: null, status: 'unavailable', slug: null, name: 'Produit indisponible', imageUrl: null, imageAlt: '', unitPrice: 0, regularPrice: null, requestedQuantity, quantity: 0, maxQuantity: 0, lineTotal: 0 };
    }
    const unitPrice = effectivePrice(product);
    const base = {
      productId,
      slug: product.slug,
      name: product.name,
      imageUrl: imageUrl(product.slug, 0),
      imageAlt: product.name,
      unitPrice,
      regularPrice: hasPromotion(product) ? product.price : null,
      requestedQuantity,
      maxQuantity: maxOrderableQuantity(product.stock),
    };
    if (isOutOfStock(product.stock)) return { ...base, status: 'out_of_stock' as const, quantity: 0, lineTotal: 0 };
    const quantity = product.stock === null ? requestedQuantity : Math.min(requestedQuantity, product.stock);
    return { ...base, status: quantity < requestedQuantity ? ('limited' as const) : ('ok' as const), quantity, lineTotal: lineTotal({ unitPrice, quantity }) };
  });
  return { lines, subtotal: computeSubtotal(lines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity }))) };
}
