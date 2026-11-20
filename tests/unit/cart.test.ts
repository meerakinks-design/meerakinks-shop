import { describe, expect, it } from 'vitest';
import { CART_STORAGE_KEY, CART_TTL_MS, MAX_CART_LINES, addToCart, cartItemCount, emptyCart, estimateSubtotal, parseStoredCart, quantityInCart, removeLine, serializeCart, setLineQuantity } from '@/lib/shop/cart';

const NOW = 1_800_000_000_000;

describe('panier (identifiants et quantités seulement)', () => {
  it('ajoute puis cumule les quantités d’un même produit', () => {
    let cart = addToCart(emptyCart(NOW), 'p1', 1, NOW);
    cart = addToCart(cart, 'p1', 2, NOW);
    cart = addToCart(cart, 'p2', 1, NOW);
    expect(cart.lines).toEqual([{ productId: 'p1', quantity: 3 }, { productId: 'p2', quantity: 1 }]);
    expect(cartItemCount(cart)).toBe(4);
    expect(quantityInCart(cart, 'p1')).toBe(3);
    expect(quantityInCart(cart, 'inconnu')).toBe(0);
  });

  it('plafonne une ligne à 20 (ou au plafond fourni, par exemple le stock)', () => {
    let cart = addToCart(emptyCart(NOW), 'p1', 19, NOW);
    cart = addToCart(cart, 'p1', 5, NOW);
    expect(quantityInCart(cart, 'p1')).toBe(20);
    expect(quantityInCart(addToCart(emptyCart(NOW), 'p1', 5, NOW, 3), 'p1')).toBe(3);
  });

  it('refuse les quantités absurdes et limite à 30 lignes', () => {
    const cart = emptyCart(NOW);
    expect(addToCart(cart, 'p1', 0, NOW)).toBe(cart);
    expect(addToCart(cart, 'p1', -2, NOW)).toBe(cart);
    expect(addToCart(cart, '', 1, NOW)).toBe(cart);
    let full = emptyCart(NOW);
    for (let index = 0; index < MAX_CART_LINES + 5; index += 1) full = addToCart(full, `p${index}`, 1, NOW);
    expect(full.lines).toHaveLength(MAX_CART_LINES);
  });

  it('modifie une quantité ; 0 retire la ligne ; une ligne absente est ignorée', () => {
    let cart = addToCart(emptyCart(NOW), 'p1', 2, NOW);
    cart = setLineQuantity(cart, 'p1', 5, NOW);
    expect(quantityInCart(cart, 'p1')).toBe(5);
    expect(setLineQuantity(cart, 'inconnu', 3, NOW)).toBe(cart);
    expect(setLineQuantity(cart, 'p1', 0, NOW).lines).toEqual([]);
    expect(removeLine(cart, 'p1', NOW).lines).toEqual([]);
  });

  it('n’estime un total que si TOUS les prix sont connus', () => {
    const cart = addToCart(addToCart(emptyCart(NOW), 'p1', 2, NOW), 'p2', 1, NOW);
    expect(estimateSubtotal(cart, { p1: 5000, p2: 2500 })).toBe(12500);
    expect(estimateSubtotal(cart, { p1: 5000 })).toBeNull();
    expect(estimateSubtotal(emptyCart(NOW), {})).toBe(0);
  });
});

describe('panier stocké', () => {
  it('se relit à l’identique', () => {
    const cart = addToCart(emptyCart(NOW), 'p1', 2, NOW);
    expect(parseStoredCart(serializeCart(cart), NOW + 1000)).toEqual(cart);
  });
  it('ne contient jamais de prix', () => {
    expect(serializeCart(addToCart(emptyCart(NOW), 'p1', 2, NOW))).not.toMatch(/price|prix/i);
    expect(CART_STORAGE_KEY).toBe('boutique.cart.v1');
  });
  it('expire après 30 jours', () => {
    const cart = addToCart(emptyCart(NOW), 'p1', 2, NOW);
    expect(parseStoredCart(serializeCart(cart), NOW + CART_TTL_MS - 1).lines).toHaveLength(1);
    expect(parseStoredCart(serializeCart(cart), NOW + CART_TTL_MS + 1).lines).toEqual([]);
  });
  it('rend un panier vide pour tout contenu invalide ou altéré', () => {
    for (const raw of [null, '', 'pas du json', '{}', '{"lines":[{"productId":"p1","quantity":-1}],"updatedAt":1}', '{"lines":[{"productId":"p1","quantity":999}],"updatedAt":1800000000000}', '[]']) {
      expect(parseStoredCart(raw, NOW).lines).toEqual([]);
    }
  });
  it('fusionne les lignes en double d’un contenu altéré', () => {
    const raw = JSON.stringify({ lines: [{ productId: 'p1', quantity: 2 }, { productId: 'p1', quantity: 3 }], updatedAt: NOW });
    expect(parseStoredCart(raw, NOW).lines).toEqual([{ productId: 'p1', quantity: 5 }]);
  });
});
