import type { MetadataRoute } from 'next';
import { categoryPath, productPath, PUBLIC_ROUTES } from '@/lib/constants/routes';
import { siteBaseUrl } from '@/lib/shop/seo';
import { listSitemapEntries } from '@/server/services/catalog.queries';

export const revalidate = 3600;

/**
 * Pages à indexer : accueil, boutique, catégories, produits publiés. Ni le back-office, ni la commande, ni les pages
 * légales provisoires (noindex tant qu'elles ne sont pas validées). Sans adresse de site configurée en production : vide.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl();
  if (!base) return [];
  const { products, categories } = await listSitemapEntries();
  return [
    { url: `${base}${PUBLIC_ROUTES.home}` },
    { url: `${base}${PUBLIC_ROUTES.shop}` },
    { url: `${base}${PUBLIC_ROUTES.categories}` },
    ...categories.map((category) => ({ url: `${base}${categoryPath(category.slug)}` })),
    ...products.map((product) => ({ url: `${base}${productPath(product.slug)}`, lastModified: product.updatedAt })),
  ];
}
