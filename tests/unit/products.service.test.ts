import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productInputSchema } from '@/lib/validation/product.schema';

// Base, Cloudinary et cache simulés : on vérifie la LOGIQUE du service (slugs, images, suppression).
const db = {
  product: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  productImage: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  slugRedirect: { findFirst: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn(),
};
const deleteCloudinaryAssets = vi.fn();
const revalidateCatalog = vi.fn();

vi.mock('@/server/db', () => ({ prisma: db }));
vi.mock('@/server/services/catalog-cache', () => ({ revalidateCatalog: (...args: unknown[]) => revalidateCatalog(...args) }));
vi.mock('@/server/integrations/cloudinary', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/integrations/cloudinary')>()),
  getCloudinaryConfig: () => ({ cloudName: 'demo', apiKey: 'k', apiSecret: 's' }),
  deleteCloudinaryAssets: (...args: unknown[]) => deleteCloudinaryAssets(...args),
}));

const { createProduct, updateProduct, deleteProduct, listAdminProducts } = await import('@/server/services/products.service');

const image = (id: string) => ({
  url: `https://res.cloudinary.com/demo/image/upload/v1/boutique/products/${id}.jpg`,
  publicId: `boutique/products/${id}`,
  alt: `Photo ${id}`,
});
const data = (overrides: Record<string, unknown> = {}) =>
  productInputSchema.parse({ name: 'Bonnet double face', description: 'Doux.', characteristics: [], price: 5000, stock: null, status: 'DRAFT', images: [], ...overrides });

const uniqueViolation = () => new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: '5.22.0' });

beforeEach(() => {
  vi.clearAllMocks();
  db.product.findFirst.mockResolvedValue(null);
  db.slugRedirect.findFirst.mockResolvedValue(null);
  db.product.findMany.mockResolvedValue([]);
  db.product.create.mockImplementation(async ({ data: input }: { data: { slug: string } }) => ({ id: 'p1', slug: input.slug }));
  db.productImage.findMany.mockResolvedValue([]);
  db.$transaction.mockImplementation(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db));
});

describe('createProduct', () => {
  it('génère un slug libre en ajoutant un suffixe quand le premier est pris', async () => {
    db.product.findFirst.mockImplementation(async ({ where }: { where: { slug: string } }) => (where.slug === 'bonnet-double-face' ? { id: 'autre' } : null));
    const created = await createProduct(data());
    expect(created.slug).toBe('bonnet-double-face-2');
  });

  it('enregistre les photos dans l’ordre reçu et rafraîchit le catalogue public', async () => {
    await createProduct(data({ images: [image('a'), image('b')], status: 'PUBLISHED' }));
    const call = db.product.create.mock.calls[0]![0] as { data: { images: { create: Array<{ publicId: string; position: number }> } } };
    expect(call.data.images.create.map((img) => [img.publicId, img.position])).toEqual([
      ['boutique/products/a', 0],
      ['boutique/products/b', 1],
    ]);
    expect(revalidateCatalog).toHaveBeenCalledWith({ products: ['bonnet-double-face'] });
  });

  it('refuse (409) un slug choisi à la main déjà utilisé, sans rien créer', async () => {
    db.product.findFirst.mockResolvedValue({ id: 'autre' });
    await expect(createProduct(data({ slug: 'pris' }))).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
    expect(db.product.create).not.toHaveBeenCalled();
  });

  it('refuse (422) une photo qui ne vient pas de notre Cloudinary', async () => {
    const foreign = { url: 'https://pirate.example/a.jpg', publicId: 'boutique/products/a', alt: 'Photo' };
    await expect(createProduct(data({ images: [foreign] }))).rejects.toMatchObject({ status: 422 });
    expect(db.product.create).not.toHaveBeenCalled();
  });

  it('refuse (409) un lien qui est l’ancien lien (redirection) d’un autre produit', async () => {
    db.slugRedirect.findFirst.mockResolvedValue({ id: 'r1' });
    await expect(createProduct(data({ slug: 'ancien-lien' }))).rejects.toMatchObject({ status: 409, fields: { slug: expect.any(Array) } });
    expect(db.product.create).not.toHaveBeenCalled();
  });

  it('traduit un SKU déjà utilisé en erreur sur le champ « sku »', async () => {
    db.product.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: '5.22.0', meta: { target: ['sku'] } }));
    await expect(createProduct(data({ sku: 'BK-1' }))).rejects.toMatchObject({ status: 409, fields: { sku: expect.any(Array) } });
  });

  it('traduit la collision de deux créations simultanées (contrainte unique) en 409', async () => {
    db.product.create.mockRejectedValue(uniqueViolation());
    await expect(createProduct(data())).rejects.toMatchObject({ status: 409 });
  });
});

describe('updateProduct', () => {
  const existing = (publicIds: string[], status = 'PUBLISHED') => ({ slug: 'bonnet', status, publishedAt: null, images: publicIds.map((publicId) => ({ publicId })) });

  it('renvoie 404 pour un produit inconnu', async () => {
    db.product.findUnique.mockResolvedValue(null);
    await expect(updateProduct('nope', data())).rejects.toMatchObject({ status: 404 });
  });

  it('ne supprime chez Cloudinary que les photos retirées, après l’enregistrement', async () => {
    db.product.findUnique.mockResolvedValue(existing(['boutique/products/a', 'boutique/products/b']));
    await updateProduct('p1', data({ images: [image('a')] }));
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(deleteCloudinaryAssets).toHaveBeenCalledWith(['boutique/products/b']);
  });

  it('ne supprime pas une photo encore utilisée par un autre produit', async () => {
    db.product.findUnique.mockResolvedValue(existing(['boutique/products/a', 'boutique/products/b']));
    db.productImage.findMany.mockResolvedValue([{ publicId: 'boutique/products/b' }]);
    await updateProduct('p1', data({ images: [image('a')] }));
    expect(deleteCloudinaryAssets).toHaveBeenCalledWith([]);
  });

  it('refuse un nouveau slug déjà pris par un AUTRE produit mais accepte de garder le sien', async () => {
    db.product.findUnique.mockResolvedValue(existing([]));
    db.product.findFirst.mockResolvedValue({ id: 'autre' });
    await expect(updateProduct('p1', data({ slug: 'pris' }))).rejects.toMatchObject({ status: 409 });
    db.product.findFirst.mockClear();
    await expect(updateProduct('p1', data({ slug: 'bonnet' }))).resolves.toEqual({ id: 'p1', slug: 'bonnet' });
    expect(db.product.findFirst).not.toHaveBeenCalled();
  });

  it('rafraîchit l’ancienne et la nouvelle adresse quand le slug change', async () => {
    db.product.findUnique.mockResolvedValue(existing([]));
    await updateProduct('p1', data({ slug: 'nouveau-lien' }));
    expect(revalidateCatalog).toHaveBeenCalledWith({ products: ['nouveau-lien', 'bonnet'] });
  });
});

describe('updateProduct — redirections de slug', () => {
  const existing = (status: string) => ({ slug: 'bonnet', status, publishedAt: null, images: [] });

  it('garde l’ancien lien d’un produit publié : redirection vers le produit, et libère le nouveau lien', async () => {
    db.product.findUnique.mockResolvedValue(existing('PUBLISHED'));
    await updateProduct('p1', data({ slug: 'nouveau-lien' }));
    expect(db.slugRedirect.deleteMany).toHaveBeenCalledWith({ where: { entity: 'PRODUCT', fromSlug: 'nouveau-lien' } });
    expect(db.slugRedirect.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { entity: 'PRODUCT', fromSlug: 'bonnet', productId: 'p1' }, update: { productId: 'p1' } }),
    );
  });

  it('garde aussi l’ancien lien d’un produit archivé (il a été public)', async () => {
    db.product.findUnique.mockResolvedValue(existing('ARCHIVED'));
    await updateProduct('p1', data({ slug: 'nouveau-lien' }));
    expect(db.slugRedirect.upsert).toHaveBeenCalledTimes(1);
  });

  it('ne crée aucune redirection pour un brouillon (son lien n’a jamais été public)', async () => {
    db.product.findUnique.mockResolvedValue(existing('DRAFT'));
    await updateProduct('p1', data({ slug: 'nouveau-lien' }));
    expect(db.slugRedirect.upsert).not.toHaveBeenCalled();
  });

  it('ne touche pas aux redirections quand le lien ne change pas', async () => {
    db.product.findUnique.mockResolvedValue(existing('PUBLISHED'));
    await updateProduct('p1', data({ slug: 'bonnet' }));
    expect(db.slugRedirect.upsert).not.toHaveBeenCalled();
    expect(db.slugRedirect.deleteMany).not.toHaveBeenCalled();
  });
});

describe('date de première publication (badge « Nouveau »)', () => {
  it('est posée à la création d’un produit publié, absente pour un brouillon', async () => {
    await createProduct(data({ images: [image('a')], status: 'PUBLISHED' }));
    expect((db.product.create.mock.calls[0]![0] as { data: { publishedAt: unknown } }).data.publishedAt).toBeInstanceOf(Date);
    await createProduct(data({ status: 'DRAFT' }));
    expect((db.product.create.mock.calls[1]![0] as { data: { publishedAt: unknown } }).data.publishedAt).toBeNull();
  });

  it('est posée à la PREMIÈRE publication d’un brouillon', async () => {
    db.product.findUnique.mockResolvedValue({ slug: 'bonnet', status: 'DRAFT', publishedAt: null, images: [] });
    await updateProduct('p1', data({ images: [image('a')], status: 'PUBLISHED' }));
    const update = db.product.update.mock.calls[0]![0] as { data: { publishedAt: unknown } };
    expect(update.data.publishedAt).toBeInstanceOf(Date);
  });

  it('ne change JAMAIS une fois posée (dépublier puis republier ne rend pas « Nouveau »)', async () => {
    const first = new Date('2026-01-05T00:00:00Z');
    db.product.findUnique.mockResolvedValue({ slug: 'bonnet', status: 'DRAFT', publishedAt: first, images: [] });
    await updateProduct('p1', data({ images: [image('a')], status: 'PUBLISHED' }));
    expect((db.product.update.mock.calls[0]![0] as { data: { publishedAt: unknown } }).data.publishedAt).toBe(first);
  });

  it('un brouillon modifié reste sans date', async () => {
    db.product.findUnique.mockResolvedValue({ slug: 'bonnet', status: 'DRAFT', publishedAt: null, images: [] });
    await updateProduct('p1', data({ status: 'DRAFT' }));
    expect((db.product.update.mock.calls[0]![0] as { data: { publishedAt: unknown } }).data.publishedAt).toBeNull();
  });

  it('enregistre le choix « mis en avant »', async () => {
    await createProduct(data({ isFeatured: true }));
    expect((db.product.create.mock.calls[0]![0] as { data: { isFeatured: unknown } }).data.isFeatured).toBe(true);
  });
});

describe('listAdminProducts', () => {
  it('masque les produits archivés par défaut, les montre quand on filtre dessus', async () => {
    await listAdminProducts();
    expect((db.product.findMany.mock.calls[0]![0] as { where: { status: unknown } }).where.status).toEqual({ not: 'ARCHIVED' });
    await listAdminProducts({ status: 'ARCHIVED' });
    expect((db.product.findMany.mock.calls[1]![0] as { where: { status: unknown } }).where.status).toBe('ARCHIVED');
  });
});

describe('deleteProduct', () => {
  it('refuse (409) de supprimer un produit présent dans des commandes', async () => {
    db.product.findUnique.mockResolvedValue({ slug: 'bonnet', images: [], _count: { orderItems: 3 } });
    await expect(deleteProduct('p1')).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
    expect(db.product.delete).not.toHaveBeenCalled();
  });

  it('supprime le produit puis ses photos chez Cloudinary', async () => {
    db.product.findUnique.mockResolvedValue({ slug: 'bonnet', images: [{ publicId: 'boutique/products/a' }], _count: { orderItems: 0 } });
    await deleteProduct('p1');
    expect(db.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(deleteCloudinaryAssets).toHaveBeenCalledWith(['boutique/products/a']);
    expect(revalidateCatalog).toHaveBeenCalledWith({ products: ['bonnet'] });
  });

  it('renvoie 404 pour un produit inconnu', async () => {
    db.product.findUnique.mockResolvedValue(null);
    await expect(deleteProduct('nope')).rejects.toMatchObject({ status: 404 });
  });
});
