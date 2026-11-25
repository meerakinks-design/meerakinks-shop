import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductForm } from '@/components/admin/ProductForm';
import { requireAdminPage } from '@/server/auth/guards';
import { listCategories } from '@/server/services/categories.service';

export const metadata: Metadata = { title: 'Nouveau produit' };
export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  await requireAdminPage();
  const categories = await listCategories();

  return (
    <main>
      <Link className="back-link" href="/admin/produits">
        ← Retour aux produits
      </Link>
      <div className="page-head">
        <h1>Nouveau produit</h1>
      </div>
      <ProductForm categories={categories.map(({ id, name, isArchived }) => ({ id, name, isArchived }))} />
    </main>
  );
}
