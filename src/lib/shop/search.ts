// Paramètres du catalogue de la landing (section #boutique, ex-page /boutique) : lus, nettoyés et bornés (jamais confiance à
// l'adresse saisie). Le filtrage se fait dans le navigateur (filterShopProducts) : la landing reste une page statique.

import { effectivePrice, hasPromotion } from '@/lib/shop/product-display';
import type { ShopProduct } from '@/lib/shop/sections';

export const SHOP_SORTS = ['defaut', 'nouveautes', 'prix-croissant', 'prix-decroissant'] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];

export interface ShopParams {
  categorySlug: string | null;
  offers: boolean;
  sort: ShopSort;
  query: string;
}

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

export function parseShopParams(raw: RawParams): ShopParams {
  const category = first(raw.categorie)?.trim().toLowerCase();
  const sort = first(raw.tri);
  return {
    categorySlug: category && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category) && category.length <= 80 ? category : null,
    offers: first(raw.filtre) === 'offres',
    sort: (SHOP_SORTS as readonly string[]).includes(sort ?? '') ? (sort as ShopSort) : 'defaut',
    query: (first(raw.q) ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
  };
}

/** Vrai dès qu'un filtre, un tri ou une recherche est actif. */
export const hasShopFilters = (params: ShopParams): boolean =>
  params.categorySlug !== null || params.offers || params.sort !== 'defaut' || params.query !== '';

/** Ancienne adresse /boutique pour un jeu de paramètres (valeurs par défaut omises) ; next.config.mjs la redirige vers la landing. */
export function shopHref(current: ShopParams, changes: Partial<ShopParams> = {}): string {
  const next = { ...current, ...changes };
  const query = new URLSearchParams();
  if (next.categorySlug) query.set('categorie', next.categorySlug);
  if (next.offers) query.set('filtre', 'offres');
  if (next.sort !== 'defaut') query.set('tri', next.sort);
  if (next.query) query.set('q', next.query);
  const text = query.toString();
  return text ? `/boutique?${text}` : '/boutique';
}

/**
 * Filtre et trie les produits déjà chargés par la landing (même règles que l'ancienne page /boutique) :
 *  - catégorie : par identifiant lisible (slug) ; offres : prix promotionnel réel ;
 *  - recherche : le nom contient le texte, sans tenir compte des majuscules ;
 *  - « nouveautés » : les produits récents d'abord ; tri par prix : sur le prix FACTURÉ (promotion comprise) ;
 *  - sans tri (« Sélection ») : l'ordre d'affichage choisi par la vendeuse, inchangé.
 * Ne modifie jamais la liste reçue.
 */
export function filterShopProducts(products: readonly ShopProduct[], params: ShopParams): ShopProduct[] {
  const needle = params.query.toLocaleLowerCase('fr');
  const kept = products.filter(
    (product) =>
      (params.categorySlug === null || product.category?.slug === params.categorySlug) &&
      (!params.offers || hasPromotion(product)) &&
      (needle === '' || product.name.toLocaleLowerCase('fr').includes(needle)),
  );
  if (params.sort === 'nouveautes') return [...kept.filter((product) => product.isNew), ...kept.filter((product) => !product.isNew)];
  if (params.sort === 'prix-croissant' || params.sort === 'prix-decroissant') {
    const sign = params.sort === 'prix-croissant' ? 1 : -1;
    return [...kept].sort((a, b) => sign * (effectivePrice(a) - effectivePrice(b)));
  }
  return kept;
}
