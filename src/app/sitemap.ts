import type { MetadataRoute } from 'next';
import { categoryPath, productPath, PUBLIC_ROUTES } from '@/lib/constants/routes';
import { listSitemapEntries } from '@/server/services/catalog.queries';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const { products, categories } = await listSitemapEntries();
  return [
    { url: `${base}${PUBLIC_ROUTES.home}` },
    { url: `${base}${PUBLIC_ROUTES.shop}` },
    { url: `${base}${PUBLIC_ROUTES.categories}` },
    ...categories.map((category) => ({ url: `${base}${categoryPath(category.slug)}` })),
    ...products.map((product) => ({ url: `${base}${productPath(product.slug)}`, lastModified: product.updatedAt })),
  ];
}
