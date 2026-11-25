import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/admin/ProductForm';
import { requireAdminPage } from '@/server/auth/guards';
import { listCategories } from '@/server/services/categories.service';
import { getAdminProduct } from '@/server/services/products.service';

export const metadata: Metadata = { title: 'Modifier le produit' };
export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requireAdminPage();
  const [product, categories] = await Promise.all([getAdminProduct(params.id), listCategories()]);
  if (!product) notFound();

  return (
    <main>
      <Link className="back-link" href="/admin/produits">
        ← Retour aux produits
      </Link>
      <div className="page-head">
        <h1>{product.name}</h1>
      </div>
      <ProductForm initial={product} categories={categories.map(({ id, name, isArchived }) => ({ id, name, isArchived }))} />
    </main>
  );
}
