import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/admin/EmptyState';
import { cloudinaryThumbnail } from '@/lib/cloudinary-url';
import { PRODUCT_STATUS_LABELS, type ProductStatusValue } from '@/lib/constants/product';
import { formatFcfa } from '@/lib/money';
import { requireAdminPage } from '@/server/auth/guards';
import { listAdminProducts } from '@/server/services/products.service';

export const metadata: Metadata = { title: 'Produits' };
export const dynamic = 'force-dynamic';

interface ProductsPageProps {
  searchParams: { statut?: string | string[]; q?: string | string[] };
}

const STATUS_BY_PARAM: Record<string, ProductStatusValue> = {
  publies: 'PUBLISHED',
  brouillons: 'DRAFT',
  archives: 'ARCHIVED',
};

const BADGE_BY_STATUS: Record<ProductStatusValue, string> = {
  PUBLISHED: 'badge-ok',
  DRAFT: 'badge-muted',
  ARCHIVED: 'badge-warn',
};

const stockLabel = (stock: number | null) => (stock === null ? 'Stock non suivi' : stock === 0 ? 'Épuisé' : `${stock} en stock`);

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  await requireAdminPage(); // chaque page vérifie : un layout ne protège pas ses pages à lui seul

  const statut = typeof searchParams.statut === 'string' ? searchParams.statut : undefined;
  const status = statut ? STATUS_BY_PARAM[statut] : undefined;
  const query = typeof searchParams.q === 'string' ? searchParams.q.trim().slice(0, 80) : '';

  const products = await listAdminProducts({ status, query });
  const hasFilter = Boolean(status || query);

  const queryPart = query ? `&q=${encodeURIComponent(query)}` : '';
  const filters = [
    { label: 'Tous', href: query ? `/admin/produits?q=${encodeURIComponent(query)}` : '/admin/produits', active: !status },
    { label: 'Publiés', href: `/admin/produits?statut=publies${queryPart}`, active: status === 'PUBLISHED' },
    { label: 'Brouillons', href: `/admin/produits?statut=brouillons${queryPart}`, active: status === 'DRAFT' },
    { label: 'Archivés', href: `/admin/produits?statut=archives${queryPart}`, active: status === 'ARCHIVED' },
  ];

  return (
    <main>
      <div className="page-head">
        <h1>Produits</h1>
        <Link className="btn" href="/admin/produits/nouveau">
          Nouveau produit
        </Link>
      </div>

      <div className="toolbar">
        <nav aria-label="Filtrer par statut" className="filter-links">
          {filters.map((filter) => (
            <Link key={filter.label} href={filter.href} aria-current={filter.active ? 'page' : undefined}>
              {filter.label}
            </Link>
          ))}
        </nav>
        <form action="/admin/produits" method="get" role="search" className="search-form">
          {status && statut && <input type="hidden" name="statut" value={statut} />}
          <label className="visually-hidden" htmlFor="q">
            Rechercher un produit
          </label>
          <input id="q" name="q" type="search" defaultValue={query} placeholder="Nom ou référence" maxLength={80} />
          <button className="btn btn-quiet" type="submit">
            Chercher
          </button>
        </form>
      </div>

      {products.length === 0 ? (
        hasFilter ? (
          <EmptyState title="Aucun produit ne correspond" description="Essaie un autre mot ou retire le filtre." action={{ href: '/admin/produits', label: 'Voir tous les produits' }} />
        ) : (
          <EmptyState title="Aucun produit pour le moment" description="Crée ton premier produit : il restera en brouillon tant que tu ne le publies pas." action={{ href: '/admin/produits/nouveau', label: 'Créer le premier produit' }} />
        )
      ) : (
        <ul className="product-list">
          {products.map((product) => {
            const image = product.images[0];
            return (
              <li key={product.id}>
                <Link href={`/admin/produits/${product.id}`} className="product-row">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cloudinaryThumbnail(image.url, 160)} alt={image.alt} width={64} height={64} loading="lazy" />
                  ) : (
                    <span className="product-placeholder" aria-hidden="true" />
                  )}
                  <span className="product-info">
                    <strong>{product.name}</strong>
                    <span className="help-text">
                      {formatFcfa(product.salePrice ?? product.price)}
                      {product.salePrice !== null ? ' (promo)' : ''} · {stockLabel(product.stock)}
                      {product.category ? ` · ${product.category.name}` : ''}
                    </span>
                  </span>
                  <span className={`badge ${BADGE_BY_STATUS[product.status]}`}>{PRODUCT_STATUS_LABELS[product.status]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
