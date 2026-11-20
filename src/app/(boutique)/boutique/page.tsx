import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/shop/JsonLd';
import { ShopGrid } from '@/components/shop/ShopGrid';
import { hasShopFilters, parseShopParams, shopHref, type ShopSort } from '@/lib/shop/search';
import { absoluteUrl } from '@/lib/shop/seo';
import { listActiveCategories, listShopProducts } from '@/server/services/catalog.queries';

// Les variantes filtrées ou triées ont pour adresse canonique /boutique (pas de contenu dupliqué).
export const metadata: Metadata = {
  title: 'Boutique',
  description: 'Découvrez tous nos produits, par catégorie, par nouveautés ou par offres.',
  alternates: { canonical: '/boutique' },
};

// Recherche et filtres lus dans l'adresse : la page est calculée à chaque demande.
export const dynamic = 'force-dynamic';

const SORT_LABELS: Array<{ sort: ShopSort; label: string }> = [
  { sort: 'defaut', label: 'Sélection' },
  { sort: 'nouveautes', label: 'Nouveautés' },
  { sort: 'prix-croissant', label: 'Prix croissant' },
  { sort: 'prix-decroissant', label: 'Prix décroissant' },
];

export default async function ShopPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const params = parseShopParams(searchParams);
  const [products, categories] = await Promise.all([listShopProducts(params), listActiveCategories()]);
  const filtered = hasShopFilters(params);
  // Une grille régulière dès qu'on trie ou filtre : l'ordre doit rester lisible.
  const uniform = params.sort !== 'defaut' || filtered;

  const home = absoluteUrl('/');
  const shop = absoluteUrl('/boutique');

  return (
    <div className="container section">
      <h1>Boutique</h1>

      <form action="/boutique" method="get" role="search" className="shop-search">
        {params.categorySlug && <input type="hidden" name="categorie" value={params.categorySlug} />}
        {params.offers && <input type="hidden" name="filtre" value="offres" />}
        {params.sort !== 'defaut' && <input type="hidden" name="tri" value={params.sort} />}
        <label className="visually-hidden" htmlFor="shop-q">
          Rechercher un produit
        </label>
        <input id="shop-q" name="q" type="search" defaultValue={params.query} placeholder="Rechercher un produit" maxLength={80} />
        <button className="btn" type="submit">
          Rechercher
        </button>
      </form>

      <nav aria-label="Filtrer par catégorie" className="chip-row">
        <Link href={shopHref(params, { categorySlug: null })} aria-current={params.categorySlug === null ? 'true' : undefined}>
          Tout
        </Link>
        {categories.map((category) => (
          <Link key={category.id} href={shopHref(params, { categorySlug: category.slug })} aria-current={params.categorySlug === category.slug ? 'true' : undefined}>
            {category.name}
          </Link>
        ))}
        <Link href={shopHref(params, { offers: !params.offers })} aria-current={params.offers ? 'true' : undefined}>
          Offres
        </Link>
      </nav>

      <nav aria-label="Trier les produits" className="chip-row chip-row-quiet">
        <span>Trier :</span>
        {SORT_LABELS.map((item) => (
          <Link key={item.sort} href={shopHref(params, { sort: item.sort })} aria-current={params.sort === item.sort ? 'true' : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>

      <p className="help-text" role="status">
        {products.length === 0 ? 'Aucun produit' : `${products.length} produit${products.length > 1 ? 's' : ''}`}
      </p>

      {products.length === 0 ? (
        <div className="empty-state">
          <h2>{filtered ? 'Aucun produit ne correspond à votre recherche.' : 'Les produits arrivent bientôt.'}</h2>
          {filtered && (
            <Link className="btn" href="/boutique">
              Voir toute la boutique
            </Link>
          )}
        </div>
      ) : (
        <ShopGrid products={products} uniform={uniform} showCategory={categories.length > 0} />
      )}

      {home && shop && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Accueil', item: home },
              { '@type': 'ListItem', position: 2, name: 'Boutique', item: shop },
            ],
          }}
        />
      )}
    </div>
  );
}
