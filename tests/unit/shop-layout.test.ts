import { describe, expect, it } from 'vitest';
import { arrangeGrid, hashString, slotForProduct } from '@/lib/shop/layout';
import { FALLBACK_ACCENTS, buildShopLayout, type ShopCategory, type ShopProduct } from '@/lib/shop/sections';

const product = (id: string, categoryId: string | null = null): ShopProduct => ({
  id, slug: id, name: id, price: 1000, salePrice: null, stock: null, isNew: false, image: null,
  category: categoryId ? { id: categoryId, name: categoryId, slug: categoryId } : null,
});
const category = (id: string, position: number, accentColor: string | null = null): ShopCategory => ({ id, name: id, slug: id, description: null, accentColor, position });

describe('disposition de la grille', () => {
  it('est stable : le même produit a toujours la même place', () => {
    for (const id of ['abc', 'cl9x0y1z2', 'produit-42']) expect(slotForProduct(id)).toEqual(slotForProduct(id));
    expect(hashString('abc')).toBe(hashString('abc'));
  });
  it('varie réellement les tailles et les décalages', () => {
    const slots = Array.from({ length: 300 }, (_, index) => slotForProduct(`id-${index}`));
    expect(new Set(slots.map((slot) => slot.size)).size).toBe(3);
    expect(new Set(slots.map((slot) => slot.offset)).size).toBe(3);
    const small = slots.filter((slot) => slot.size === 'small').length / slots.length;
    expect(small).toBeGreaterThan(0.3);
    expect(small).toBeLessThan(0.5);
  });
  it('garde l’ordre choisi par la vendeuse', () => {
    const arranged = arrangeGrid([{ id: 'b' }, { id: 'a' }, { id: 'c' }]);
    expect(arranged.map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('buildShopLayout', () => {
  it('passe en grille quand il n’y a aucune catégorie', () => {
    const layout = buildShopLayout([], [product('p1'), product('p2')]);
    expect(layout.mode).toBe('grid');
    if (layout.mode === 'grid') expect(layout.products).toHaveLength(2);
  });
  it('passe en grille quand les catégories n’ont aucun produit publié', () => {
    expect(buildShopLayout([category('c1', 0)], [product('p1')]).mode).toBe('grid');
  });
  it('fait une section par catégorie, dans l’ordre défini, sans section pour une catégorie vide', () => {
    const layout = buildShopLayout(
      [category('b', 2), category('a', 1), category('vide', 3)],
      [product('p1', 'a'), product('p2', 'b'), product('p3', 'a')],
    );
    expect(layout.mode).toBe('categories');
    if (layout.mode === 'categories') {
      expect(layout.sections.map((section) => section.category.id)).toEqual(['a', 'b']);
      expect(layout.sections[0]!.products.map((item) => item.id)).toEqual(['p1', 'p3']);
    }
  });
  it('range les produits sans catégorie dans « autres produits » (P-06)', () => {
    const layout = buildShopLayout([category('a', 1)], [product('p1', 'a'), product('p2'), product('p3', 'archivee')]);
    if (layout.mode !== 'categories') throw new Error('mode attendu : categories');
    expect(layout.others.map((item) => item.id)).toEqual(['p2', 'p3']);
  });
  it('utilise la couleur de la catégorie, avec un texte lisible (noir ou blanc)', () => {
    const layout = buildShopLayout([category('a', 1, '#f2c94c'), category('b', 2, '#7a3f98')], [product('p1', 'a'), product('p2', 'b')]);
    if (layout.mode !== 'categories') throw new Error('mode attendu : categories');
    expect(layout.sections.map((section) => [section.background, section.textColor])).toEqual([['#f2c94c', '#000000'], ['#7a3f98', '#ffffff']]);
  });
  it('donne une couleur provisoire aux catégories sans couleur', () => {
    const layout = buildShopLayout([category('a', 1), category('b', 2)], [product('p1', 'a'), product('p2', 'b')]);
    if (layout.mode !== 'categories') throw new Error('mode attendu : categories');
    expect(layout.sections.map((section) => section.background)).toEqual([FALLBACK_ACCENTS[0], FALLBACK_ACCENTS[1]]);
  });
});
