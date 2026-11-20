import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { JsonLd } from '@/components/shop/JsonLd';
import { ShopGrid } from '@/components/shop/ShopGrid';
import { categoryPath } from '@/lib/constants/routes';
import { absoluteUrl, summarize } from '@/lib/shop/seo';
import { getCategoryPage } from '@/server/services/catalog.queries';
import { resolveCategorySlug } from '@/server/services/slug-redirects.service';

// Générée à la première visite puis mise en cache ; rafraîchie après chaque modification du back-office.
export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

/** Un ancien slug redirige (308, permanent) vers le slug actuel ; un lien inconnu donne une 404. */
async function loadCategory(slug: string) {
  const resolution = await resolveCategorySlug(slug);
  if (resolution.kind === 'redirect') permanentRedirect(categoryPath(resolution.slug));
  if (resolution.kind === 'missing') notFound();
  const page = await getCategoryPage(resolution.id);
  if (!page) notFound();
  return page;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const resolution = await resolveCategorySlug(params.slug);
  if (resolution.kind !== 'found') return {};
  const page = await getCategoryPage(resolution.id);
  if (!page) return {};
  return {
    title: page.category.name,
    description: summarize(page.category.description ?? `Découvrez la collection ${page.category.name}.`),
    alternates: { canonical: categoryPath(page.category.slug) },
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const { category, products } = await loadCategory(params.slug);
  const home = absoluteUrl('/');
  const url = absoluteUrl(categoryPath(category.slug));

  return (
    <div className="container section">
      <p>
        <Link href="/boutique">← Retour à la boutique</Link>
      </p>
      <h1>{category.name}</h1>
      {category.description && <p className="lead">{category.description}</p>}
      {products.length === 0 ? (
        <div className="empty-state">
          <h2>Aucun produit dans cette catégorie pour le moment.</h2>
          <Link className="btn" href="/boutique">
            Voir toute la boutique
          </Link>
        </div>
      ) : (
        <ShopGrid products={products} />
      )}
      {home && url && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Accueil', item: home },
              { '@type': 'ListItem', position: 2, name: category.name, item: url },
            ],
          }}
        />
      )}
    </div>
  );
}
