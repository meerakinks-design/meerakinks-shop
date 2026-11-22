import { z } from 'zod';
import { MAX_QUANTITY_PER_LINE } from '@/lib/shop/product-display';

// Panier côté navigateur : UNIQUEMENT des identifiants et des quantités, jamais de prix.
// Les prix viennent toujours du serveur (devis du panier, puis commande).

export const CART_STORAGE_KEY = 'boutique.cart.v1';
export const MAX_CART_LINES = 30;
export const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CartLine {
  productId: string;
  variantId?: string | null;
  quantity: number;
}
export interface CartState {
  lines: CartLine[];
  updatedAt: number;
}

export const emptyCart = (now: number = Date.now()): CartState => ({ lines: [], updatedAt: now });

const clampQuantity = (quantity: number, max: number = MAX_QUANTITY_PER_LINE): number =>
  Math.max(0, Math.min(Math.floor(quantity), max));

export function addToCart(state: CartState, productId: string, quantity = 1, now: number = Date.now(), max: number = MAX_QUANTITY_PER_LINE, variantId: string | null = null): CartState {
  if (!productId || !Number.isFinite(quantity) || quantity < 1) return state;
  const existing = state.lines.find((line) => line.productId === productId && (line.variantId ?? null) === variantId);
  if (existing) {
    const next = clampQuantity(existing.quantity + quantity, max);
    return {
      lines: state.lines.map((line) => (line.productId === productId && (line.variantId ?? null) === variantId ? { ...line, quantity: next } : line)),
      updatedAt: now,
    };
  }
  if (state.lines.length >= MAX_CART_LINES) return state;
  const initial = clampQuantity(quantity, max);
  if (initial < 1) return state;
  return { lines: [...state.lines, { productId, ...(variantId ? { variantId } : {}), quantity: initial }], updatedAt: now };
}

/** 0 retire la ligne. */
export function setLineQuantity(state: CartState, productId: string, quantity: number, now: number = Date.now(), max: number = MAX_QUANTITY_PER_LINE, variantId: string | null = null): CartState {
  const next = clampQuantity(Number.isFinite(quantity) ? quantity : 0, max);
  if (next === 0) return removeLine(state, productId, now, variantId);
  if (!state.lines.some((line) => line.productId === productId && (line.variantId ?? null) === variantId)) return state;
  return { lines: state.lines.map((line) => (line.productId === productId && (line.variantId ?? null) === variantId ? { ...line, quantity: next } : line)), updatedAt: now };
}

export const removeLine = (state: CartState, productId: string, now: number = Date.now(), variantId: string | null = null): CartState => ({
  lines: state.lines.filter((line) => !(line.productId === productId && (line.variantId ?? null) === variantId)),
  updatedAt: now,
});

export const cartItemCount = (state: CartState): number => state.lines.reduce((sum, line) => sum + line.quantity, 0);
export const quantityInCart = (state: CartState, productId: string, variantId: string | null = null): number =>
  state.lines.find((line) => line.productId === productId && (line.variantId ?? null) === variantId)?.quantity ?? 0;

/** Estimation d'affichage (en-tête). null tant qu'un prix est inconnu : on n'affiche jamais un total faux. */
export function estimateSubtotal(state: CartState, prices: Record<string, number | undefined>): number | null {
  let total = 0;
  for (const line of state.lines) {
    const price = prices[line.productId];
    if (price === undefined) return null;
    total += price * line.quantity;
  }
  return total;
}

const storedCartSchema = z.object({
  lines: z
    .array(z.object({ productId: z.string().min(1).max(64), variantId: z.string().min(1).max(64).nullable().default(null), quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE) }))
    .max(MAX_CART_LINES),
  updatedAt: z.number().finite(),
});

/** Relit le panier stocké. Tout ce qui est invalide, altéré ou expiré (30 jours) donne un panier vide. */
export function parseStoredCart(raw: string | null, now: number = Date.now()): CartState {
  if (!raw) return emptyCart(now);
  try {
    const parsed = storedCartSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return emptyCart(now);
    if (now - parsed.data.updatedAt > CART_TTL_MS) return emptyCart(now);
    const merged = new Map<string, number>();
    for (const line of parsed.data.lines) {
      const key = `${line.productId}:${line.variantId ?? ''}`;
      merged.set(key, clampQuantity((merged.get(key) ?? 0) + line.quantity));
    }
    return { lines: [...merged].map(([key, quantity]) => { const [productId = '', variant = ''] = key.split(':'); return { productId, ...(variant ? { variantId: variant } : {}), quantity }; }), updatedAt: parsed.data.updatedAt };
  } catch {
    return emptyCart(now);
  }
}

export const serializeCart = (state: CartState): string => JSON.stringify(state);
