'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { postJson } from '@/lib/api-client';
import {
  CART_STORAGE_KEY,
  addToCart,
  cartItemCount,
  emptyCart,
  estimateSubtotal,
  parseStoredCart,
  quantityInCart,
  removeLine,
  serializeCart,
  setLineQuantity,
  type CartState,
} from '@/lib/shop/cart';
import { isOutOfStock, maxOrderableQuantity } from '@/lib/shop/product-display';
import type { CartQuote } from '@/lib/shop/quote-types';

export type QuoteStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AddableProduct {
  id: string;
  name: string;
  /** Prix facturé (promotion comprise) : sert UNIQUEMENT à l'estimation affichée avant le devis du serveur. */
  price: number;
  stock: number | null;
  variantId?: string | null;
}

interface CartContextValue {
  hydrated: boolean;
  cart: CartState;
  itemCount: number;
  quote: CartQuote | null;
  /** Vrai quand le devis du serveur correspond exactement au panier actuel. */
  quoteIsCurrent: boolean;
  quoteStatus: QuoteStatus;
  /** Estimation pour l'en-tête ; null tant qu'un prix est inconnu. */
  estimatedTotal: number | null;
  quantityOf: (productId: string, variantId?: string | null) => number;
  add: (product: AddableProduct, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number, max?: number, variantId?: string | null) => void;
  remove: (productId: string, variantId?: string | null) => void;
  clear: () => void;
  retryQuote: () => void;
  announce: (message: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart doit être utilisé dans <CartProvider>');
  return value;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(() => emptyCart(0));
  const [hydrated, setHydrated] = useState(false);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [quotedKey, setQuotedKey] = useState('');
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>('idle');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [announcement, setAnnouncement] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const requestCounter = useRef(0);

  // Le serveur rend toujours un panier vide ; le vrai panier est relu après l'hydratation (pas d'écart de rendu).
  useEffect(() => {
    try {
      setCart(parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY)));
    } catch {
      /* stockage indisponible (navigation privée stricte) : le panier vit alors en mémoire */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(cart));
    } catch {
      /* idem */
    }
  }, [cart, hydrated]);

  // Synchronisation entre onglets.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) setCart(parseStoredCart(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const linesKey = useMemo(() => JSON.stringify(cart.lines), [cart.lines]);

  // Devis officiel : les prix viennent du serveur, jamais du navigateur.
  useEffect(() => {
    if (!hydrated) return;
    const requestId = ++requestCounter.current;
    if (cart.lines.length === 0) {
      setQuote(null);
      setQuotedKey('');
      setQuoteStatus('idle');
      return;
    }
    setQuoteStatus('loading');
    const timer = window.setTimeout(async () => {
      const result = await postJson<CartQuote>('/api/v1/cart/quote', {
        items: cart.lines.map((line) => ({ productId: line.productId, variantId: line.variantId, quantity: line.quantity })),
      });
      if (requestId !== requestCounter.current) return; // une demande plus récente a pris le relais
      if (!result.ok) {
        setQuoteStatus('error');
        return;
      }
      setQuote(result.data);
      setQuotedKey(linesKey);
      setQuoteStatus('ready');
      setPrices((current) => ({
        ...current,
        ...Object.fromEntries(result.data.lines.map((line) => [line.productId, line.status === 'unavailable' ? 0 : line.unitPrice])),
      }));
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, linesKey, retryToken]);

  const announce = useCallback((message: string) => {
    setAnnouncement((previous) => (previous === message ? `${message}\u200b` : message)); // le même message est ré-annoncé
  }, []);

  const add = useCallback(
    (product: AddableProduct, quantity = 1) => {
      if (isOutOfStock(product.stock)) return;
      setPrices((current) => ({ ...current, [product.id]: product.price }));
      setCart((current) => addToCart(current, product.id, quantity, Date.now(), maxOrderableQuantity(product.stock), product.variantId ?? null));
      announce(`${product.name} ajouté à votre panier`);
    },
    [announce],
  );

  const setQuantity = useCallback((productId: string, quantity: number, max?: number, variantId: string | null = null) => {
    setCart((current) => setLineQuantity(current, productId, quantity, Date.now(), max, variantId));
  }, []);

  const remove = useCallback(
    (productId: string, variantId: string | null = null) => {
      setCart((current) => removeLine(current, productId, Date.now(), variantId));
      announce('Article retiré du panier');
    },
    [announce],
  );

  const clear = useCallback(() => setCart(emptyCart()), []);
  const retryQuote = useCallback(() => setRetryToken((token) => token + 1), []);
  const quantityOf = useCallback((productId: string, variantId: string | null = null) => quantityInCart(cart, productId, variantId), [cart]);

  const quoteIsCurrent = quote !== null && quotedKey === linesKey;
  const estimatedTotal = useMemo(() => {
    if (cart.lines.length === 0) return 0;
    if (quote && quotedKey === linesKey) return quote.subtotal;
    return estimateSubtotal(cart, prices);
  }, [cart, quote, quotedKey, linesKey, prices]);

  const value = useMemo<CartContextValue>(
    () => ({
      hydrated, cart, itemCount: cartItemCount(cart), quote, quoteIsCurrent, quoteStatus, estimatedTotal,
      quantityOf, add, setQuantity, remove, clear, retryQuote, announce,
    }),
    [hydrated, cart, quote, quoteIsCurrent, quoteStatus, estimatedTotal, quantityOf, add, setQuantity, remove, clear, retryQuote, announce],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <div className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </div>
    </CartContext.Provider>
  );
}
