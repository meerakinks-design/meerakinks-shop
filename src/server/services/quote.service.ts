import { MAX_QUANTITY_PER_LINE, effectivePrice, hasPromotion, isOutOfStock, maxOrderableQuantity } from '@/lib/shop/product-display';
import type { CartQuote, QuoteLine } from '@/lib/shop/quote-types';
import { prisma } from '@/server/db';
import { computeSubtotal, lineTotal } from '@/server/services/pricing';

export type { CartQuote, QuoteLine, QuoteLineStatus } from '@/lib/shop/quote-types';

export interface QuoteRequestItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

/**
 * Devis du panier : relit les produits en base et calcule les montants officiels.
 * Un produit absent, dépublié ou archivé est signalé « indisponible » et exclu du total.
 */
export async function quoteCart(items: readonly QuoteRequestItem[]): Promise<CartQuote> {
  // Fusionne les lignes en double et borne les quantités : on ne fait pas confiance au navigateur.
  const requested = new Map<string, { productId: string; variantId: string | null; quantity: number }>();
  for (const item of items) {
    const key = `${item.productId}:${item.variantId ?? ''}`;
    const previous = requested.get(key)?.quantity ?? 0;
    requested.set(key, { productId: item.productId, variantId: item.variantId ?? null, quantity: Math.min(previous + item.quantity, MAX_QUANTITY_PER_LINE) });
  }
  if (requested.size === 0) return { lines: [], subtotal: 0 };

  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set([...requested.values()].map((item) => item.productId))] } },
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      salePrice: true,
      stock: true,
      status: true,
      images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
      variants: { where: { isActive: true }, select: { id: true, label: true, price: true, salePrice: true, stock: true } },
    },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  const lines: QuoteLine[] = [...requested.values()].map(({ productId, variantId, quantity: requestedQuantity }) => {
    const product = byId.get(productId);
    if (!product || product.status !== 'PUBLISHED') {
      return { productId, variantId, variantLabel: null, status: 'unavailable', slug: null, name: 'Produit indisponible', imageUrl: null, imageAlt: '', unitPrice: 0, regularPrice: null, requestedQuantity, quantity: 0, maxQuantity: 0, lineTotal: 0 };
    }
    const variant = variantId ? product.variants.find((item) => item.id === variantId) : null;
    if (variantId && !variant) return { productId, variantId, variantLabel: null, status: 'unavailable', slug: product.slug, name: product.name, imageUrl: product.images[0]?.url ?? null, imageAlt: product.images[0]?.alt ?? product.name, unitPrice: 0, regularPrice: null, requestedQuantity, quantity: 0, maxQuantity: 0, lineTotal: 0 };
    const priced = { price: variant?.price ?? product.price, salePrice: variant?.salePrice ?? product.salePrice };
    const unitPrice = effectivePrice(priced);
    const stock = variant ? variant.stock : product.stock;
    const base = {
      productId,
      variantId,
      variantLabel: variant?.label ?? null,
      slug: product.slug,
      name: product.name,
      imageUrl: product.images[0]?.url ?? null,
      imageAlt: product.images[0]?.alt ?? product.name,
      unitPrice,
      regularPrice: hasPromotion(priced) ? priced.price : null,
      requestedQuantity,
      maxQuantity: maxOrderableQuantity(stock),
    };
    if (isOutOfStock(stock)) return { ...base, status: 'out_of_stock' as const, quantity: 0, lineTotal: 0 };
    const quantity = stock === null ? requestedQuantity : Math.min(requestedQuantity, stock);
    return {
      ...base,
      status: quantity < requestedQuantity ? ('limited' as const) : ('ok' as const),
      quantity,
      lineTotal: lineTotal({ unitPrice, quantity }),
    };
  });

  return { lines, subtotal: computeSubtotal(lines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity }))) };
}
