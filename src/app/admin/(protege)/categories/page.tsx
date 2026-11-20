import type { Metadata } from 'next';
import { CategoriesManager } from '@/components/admin/CategoriesManager';
import { requireAdminPage } from '@/server/auth/guards';
import { listCategories } from '@/server/services/categories.service';

export const metadata: Metadata = { title: 'Catégories' };
export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  await requireAdminPage();
  const categories = await listCategories();

  return (
    <main>
      <div className="page-head">
        <h1>Catégories</h1>
      </div>
      <CategoriesManager categories={categories.map((category) => ({ id: category.id, name: category.name, description: category.description, accentColor: category.accentColor, position: category.position, isArchived: category.isArchived, productCount: category._count.products }))} />
    </main>
  );
}
