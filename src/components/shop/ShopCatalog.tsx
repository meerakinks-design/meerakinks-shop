'use client';

import { useEffect, useMemo, useState } from 'react';
import { LANDING } from '@/content/landing';
import { filterShopProducts, hasShopFilters, parseShopParams, type ShopParams, type ShopSort } from '@/lib/shop/search';
import type { ShopProduct } from '@/lib/shop/sections';
import { ShopGrid } from './ShopGrid';
import Spaghetti from './Spaghetti';

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
}

const SORT_LABELS: ReadonlyArray<{ sort: ShopSort; label: string }> = [
  { sort: 'defaut', label: 'Sélection' },
  { sort: 'nouveautes', label: 'Nouveautés' },
  { sort: 'prix-croissant', label: 'Prix croissant' },
  { sort: 'prix-decroissant', label: 'Prix décroissant' },
];

/**
 * Catalogue de la landing (section #boutique, juste après la section « guide ») : c'est l'ancienne page /boutique, déplacée.
 * Recherche, catégories, offres et tri se font ici, dans le navigateur, sur les produits déjà chargés : la landing reste une
 * page statique et le catalogue répond instantanément, sans changer d'adresse.
 * Une ancienne adresse comme /?filtre=offres#boutique (issue de /boutique?filtre=offres) est relue une seule fois à l'affichage.
 */
export function ShopCatalog({ products, categories }: { products: readonly ShopProduct[]; categories: readonly CatalogCategory[] }) {
  const [params, setParams] = useState<ShopParams>(() => parseShopParams({}));

  useEffect(() => {
    const initial = parseShopParams(Object.fromEntries(new URLSearchParams(window.location.search)));
    if (hasShopFilters(initial)) setParams(initial);
  }, []);

  const visible = useMemo(() => filterShopProducts(products, params), [products, params]);
  const filtered = hasShopFilters(params);
  // Une grille régulière dès qu'on trie ou filtre : l'ordre doit rester lisible.
  const uniform = filtered;
  const copy = LANDING.shop;
  const change = (changes: Partial<ShopParams>) => setParams((current) => ({ ...current, ...changes }));

  return (
    <section id="boutique" className="section shop-catalog" aria-labelledby="shop-title">
      <div className="container">
        <Spaghetti as="h2" id="shop-title" ghost={copy.titleGhost}>{copy.title}</Spaghetti>
        <p className="lead">{copy.text}</p>

        <form role="search" className="shop-search" onSubmit={(event) => event.preventDefault()}>
          <label className="visually-hidden" htmlFor="shop-q">
            Rechercher un produit
          </label>
          <input
            id="shop-q"
            name="q"
            type="search"
            value={params.query}
            onChange={(event) => change({ query: event.target.value.slice(0, 80) })}
            placeholder="Rechercher un produit"
            maxLength={80}
            autoComplete="off"
          />
        </form>

        <div role="group" aria-label="Filtrer par catégorie" className="chip-row">
          <button type="button" aria-pressed={params.categorySlug === null && !params.offers} onClick={() => change({ categorySlug: null, offers: false })}>
            Tout
          </button>
          {categories.map((category) => (
            <button key={category.id} type="button" aria-pressed={params.categorySlug === category.slug} onClick={() => change({ categorySlug: params.categorySlug === category.slug ? null : category.slug })}>
              {category.name}
            </button>
          ))}
          <button type="button" aria-pressed={params.offers} onClick={() => change({ offers: !params.offers })}>
            Offres
          </button>
        </div>

        <div role="group" aria-label="Trier les produits" className="chip-row chip-row-quiet">
          <span>Trier :</span>
          {SORT_LABELS.map((item) => (
            <button key={item.sort} type="button" aria-pressed={params.sort === item.sort} onClick={() => change({ sort: item.sort })}>
              {item.label}
            </button>
          ))}
        </div>

        <p className="help-text" role="status">
          {visible.length === 0 ? 'Aucun produit' : `${visible.length} produit${visible.length > 1 ? 's' : ''}`}
        </p>

        {visible.length === 0 ? (
          <div className="empty-state">
            <h3>{filtered ? 'Aucun produit ne correspond à votre recherche.' : 'Les produits arrivent bientôt.'}</h3>
            {filtered && (
              <button type="button" className="btn" onClick={() => setParams(parseShopParams({}))}>
                {copy.cta}
              </button>
            )}
          </div>
        ) : (
          <ShopGrid products={visible} uniform={uniform} showCategory={categories.length > 0} />
        )}
      </div>
    </section>
  );
}
