import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { filterShopProducts, parseShopParams } from '@/lib/shop/search';
import type { ShopProduct } from '@/lib/shop/sections';

// Catalogue de la landing (ex-page /boutique) : filtrage pur + rendu serveur réel de la section #boutique.
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...(rest as object)}>
      {children}
    </a>
  ),
}));

const { CartProvider } = await import('@/components/shop/CartProvider');
const { ShopCatalog } = await import('@/components/shop/ShopCatalog');

const hydratation = { id: 'c1', name: 'Hydratation', slug: 'hydratation' };
const nutrition = { id: 'c2', name: 'Nutrition', slug: 'nutrition' };
const product = (id: string, overrides: Partial<ShopProduct> = {}): ShopProduct => ({
  id, slug: `slug-${id}`, name: `Produit ${id}`, price: 5000, salePrice: null, stock: null, isNew: false, image: null, category: null, ...overrides,
});
const catalog: ShopProduct[] = [
  product('a', { name: 'Mousse Kinky', price: 6000, category: hydratation }),
  product('b', { name: 'Fluffy Kinks', price: 9000, salePrice: 7500, isNew: true, category: nutrition }),
  product('c', { name: 'Slik', price: 4000, category: hydratation }),
  product('d', { name: 'Velvet', price: 8000, isNew: true }),
];
const names = (products: ShopProduct[]) => products.map((item) => item.name);
const params = (raw: Record<string, string>) => parseShopParams(raw);

describe('filterShopProducts', () => {
  it('sans filtre : tous les produits dans l’ordre choisi par la vendeuse', () => {
    expect(names(filterShopProducts(catalog, params({})))).toEqual(['Mousse Kinky', 'Fluffy Kinks', 'Slik', 'Velvet']);
  });

  it('catégorie : seulement ses produits ; offres : seulement les prix promotionnels', () => {
    expect(names(filterShopProducts(catalog, params({ categorie: 'hydratation' })))).toEqual(['Mousse Kinky', 'Slik']);
    expect(names(filterShopProducts(catalog, params({ filtre: 'offres' })))).toEqual(['Fluffy Kinks']);
    expect(filterShopProducts(catalog, params({ categorie: 'inconnue' }))).toEqual([]);
  });

  it('recherche : le nom contient le texte, sans tenir compte des majuscules', () => {
    expect(names(filterShopProducts(catalog, params({ q: 'KINKS' })))).toEqual(['Fluffy Kinks']);
    expect(names(filterShopProducts(catalog, params({ q: 'ki' })))).toEqual(['Mousse Kinky', 'Fluffy Kinks']);
  });

  it('nouveautés : les produits récents d’abord, le reste dans l’ordre d’origine', () => {
    expect(names(filterShopProducts(catalog, params({ tri: 'nouveautes' })))).toEqual(['Fluffy Kinks', 'Velvet', 'Mousse Kinky', 'Slik']);
  });

  it('tri par prix : sur le prix FACTURÉ (promotion comprise)', () => {
    expect(names(filterShopProducts(catalog, params({ tri: 'prix-croissant' })))).toEqual(['Slik', 'Mousse Kinky', 'Fluffy Kinks', 'Velvet']);
    expect(names(filterShopProducts(catalog, params({ tri: 'prix-decroissant' })))).toEqual(['Velvet', 'Fluffy Kinks', 'Mousse Kinky', 'Slik']);
  });

  it('combine les filtres et ne modifie jamais la liste reçue', () => {
    const before = names(catalog);
    expect(names(filterShopProducts(catalog, params({ categorie: 'hydratation', tri: 'prix-croissant' })))).toEqual(['Slik', 'Mousse Kinky']);
    expect(names(catalog)).toEqual(before);
  });
});

describe('ShopCatalog (section #boutique de la landing)', () => {
  const html = renderToString(
    <CartProvider>
      <ShopCatalog products={catalog} categories={[hydratation, nutrition]} />
    </CartProvider>,
  );

  it('est la section #boutique, avec son titre, la recherche, les pastilles de catégorie et de tri', () => {
    expect(html).toContain('id="boutique"');
    expect(html).toContain('aria-labelledby="shop-title"');
    expect(html).toContain('role="search"');
    expect(html).toContain('Filtrer par catégorie');
    expect(html).toContain('Trier les produits');
    for (const label of ['Tout', 'Hydratation', 'Nutrition', 'Offres', 'Sélection', 'Nouveautés', 'Prix croissant', 'Prix décroissant']) expect(html).toContain(`>${label}<`);
  });

  it('affiche tous les produits au départ (rendu serveur identique au premier rendu du navigateur)', () => {
    expect(html).toContain('4 produits');
    for (const name of ['Mousse Kinky', 'Fluffy Kinks', 'Slik', 'Velvet']) expect(html).toContain(name);
    expect(html).toContain('aria-pressed="true"'); // « Tout » et « Sélection » sont actifs
  });
});
