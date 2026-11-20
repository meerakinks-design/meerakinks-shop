// Paramètres de la page /boutique : lus, nettoyés et bornés (jamais confiance à l'adresse saisie).

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

/** Une page filtrée garde pour adresse canonique /boutique : on évite le contenu dupliqué. */
export const hasShopFilters = (params: ShopParams): boolean =>
  params.categorySlug !== null || params.offers || params.sort !== 'defaut' || params.query !== '';

/** Adresse de /boutique pour un jeu de paramètres (valeurs par défaut omises). */
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
