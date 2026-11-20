import { beforeEach, describe, expect, it, vi } from 'vitest';
import { categoryInputSchema } from '@/lib/validation/category.schema';

const db = {
  category: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  slugRedirect: { findFirst: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn(),
};
const revalidateCatalog = vi.fn();
vi.mock('@/server/db', () => ({ prisma: db }));
vi.mock('@/server/services/catalog-cache', () => ({ revalidateCatalog: (...args: unknown[]) => revalidateCatalog(...args) }));
const { createCategory, updateCategory, deleteCategory } = await import('@/server/services/categories.service');

const data = (overrides: Record<string, unknown> = {}) => categoryInputSchema.parse({ name: 'Soins capillaires', ...overrides });

beforeEach(() => {
  vi.clearAllMocks();
  db.category.findFirst.mockResolvedValue(null);
  db.slugRedirect.findFirst.mockResolvedValue(null);
  db.category.create.mockImplementation(async ({ data: input }: { data: { slug: string } }) => ({ id: 'c1', slug: input.slug }));
  db.$transaction.mockImplementation(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db));
});

describe('createCategory', () => {
  it('crée avec un slug dérivé du nom, la description et la couleur normalisée', async () => {
    const created = await createCategory(data({ description: ' Pour les cheveux ', accentColor: '#F25CA2' }));
    expect(created.slug).toBe('soins-capillaires');
    expect(db.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ description: 'Pour les cheveux', accentColor: '#f25ca2', isArchived: false }) }),
    );
    expect(revalidateCatalog).toHaveBeenCalledWith({ categories: ['soins-capillaires'] });
  });

  it('refuse (409) un lien qui est l’ancien lien d’une autre catégorie', async () => {
    db.slugRedirect.findFirst.mockResolvedValue({ id: 'r1' });
    await expect(createCategory(data({ slug: 'ancien' }))).rejects.toMatchObject({ status: 409 });
  });
});

describe('updateCategory', () => {
  it('garde l’ancien lien en redirection quand le slug change', async () => {
    db.category.findUnique.mockResolvedValue({ slug: 'cheveux' });
    await updateCategory('c1', data({ slug: 'soins-capillaires' }));
    expect(db.slugRedirect.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { entity: 'CATEGORY', fromSlug: 'cheveux', categoryId: 'c1' } }));
    expect(revalidateCatalog).toHaveBeenCalledWith({ categories: ['soins-capillaires', 'cheveux'] });
  });

  it('ne crée pas de redirection quand le slug est inchangé, et permet d’archiver', async () => {
    db.category.findUnique.mockResolvedValue({ slug: 'cheveux' });
    await updateCategory('c1', data({ slug: 'cheveux', isArchived: true }));
    expect(db.slugRedirect.upsert).not.toHaveBeenCalled();
    expect(db.category.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ isArchived: true }) }));
  });

  it('renvoie 404 pour une catégorie inconnue', async () => {
    db.category.findUnique.mockResolvedValue(null);
    await expect(updateCategory('nope', data())).rejects.toMatchObject({ status: 404 });
  });
});

describe('deleteCategory', () => {
  it('supprime et rafraîchit la page de la catégorie', async () => {
    db.category.findUnique.mockResolvedValue({ slug: 'cheveux' });
    await deleteCategory('c1');
    expect(db.category.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    expect(revalidateCatalog).toHaveBeenCalledWith({ categories: ['cheveux'] });
  });
});

describe('categoryInputSchema', () => {
  it('refuse une couleur mal formée', () => {
    expect(categoryInputSchema.safeParse({ name: 'Soins', accentColor: 'rose' }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ name: 'Soins', accentColor: '#fff' }).success).toBe(false);
    expect(categoryInputSchema.parse({ name: 'Soins', accentColor: '' }).accentColor).toBeNull();
  });
});
