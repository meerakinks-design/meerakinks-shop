import { z } from 'zod';
import { MAX_CART_LINES } from '@/lib/shop/cart';
import { MAX_QUANTITY_PER_LINE } from '@/lib/shop/product-display';

/** Une ligne de panier : identifiant et quantité, jamais de prix. Partagée par le devis et la commande. */
export const cartItemSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64).nullable().optional(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
});

export const cartQuoteSchema = z.object({
  items: z.array(cartItemSchema).max(MAX_CART_LINES),
});
export type CartQuoteInput = z.infer<typeof cartQuoteSchema>;
