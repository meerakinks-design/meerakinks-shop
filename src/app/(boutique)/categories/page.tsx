import type { Metadata } from 'next';
import Link from 'next/link';
import { readableTextColor } from '@/lib/color';
import { categoryPath } from '@/lib/constants/routes';
import { FALLBACK_ACCENTS } from '@/lib/shop/sections';
import { listActiveCategories } from '@/server/services/catalog.queries';

export const revalidate = 3600;
export const metadata: Metadata = { title: 'Catégories', description: 'Parcourez les catégories de la boutique pour trouver le produit qu’il vous faut.', alternates: { canonical: '/categories' } };

export default async function CategoriesPage() {
  const categories = await listActiveCategories();
  return (
    <div className="container section">
      <h1>Catégories</h1>
      {categories.length === 0 ? (
        <div className="empty-state">
          <h2>Les catégories arrivent bientôt.</h2>
          <Link className="btn" href="/boutique">
            Voir la boutique
          </Link>
        </div>
      ) : (
        <ul className="collection-cards">
          {categories.map((category, index) => {
            const background = category.accentColor ?? FALLBACK_ACCENTS[index % FALLBACK_ACCENTS.length]!;
            return (
              <li key={category.id} className="collection-card" style={{ background, color: readableTextColor(background) }}>
                <h2>{category.name}</h2>
                {category.description && <p>{category.description}</p>}
                <p>{category._count.products} produit{category._count.products > 1 ? 's' : ''}</p>
                <Link href={categoryPath(category.slug)}>Explorer la collection</Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
