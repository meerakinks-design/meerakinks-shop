import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = {
  product: { findMany: vi.fn(), findFirst: vi.fn() },
  category: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
  storeSettings: { findUnique: vi.fn() },
};
vi.mock('@/server/db', () => ({ prisma: db }));
const queries = await import('@/server/services/catalog.queries');

const NOW = new Date('2026-11-14T12:00:00Z');
const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1', slug: 'bonnet', name: 'Bonnet', price: 5000, salePrice: null, stock: null,
  publishedAt: new Date('2026-11-10T00:00:00Z'),
  category: { id: 'c1', name: 'Accessoires', slug: 'accessoires', isArchived: false },
  images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1/boutique/products/a.jpg', alt: 'Bonnet' }],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SKIP_DB_AT_BUILD;
});

describe('toShopProduct', () => {
  it('produit des données sérialisables avec badge « Nouveau » calculé', () => {
    const product = queries.toShopProduct(row() as never, NOW);
    expect(product).toMatchObject({ id: 'p1', isNew: true, image: { alt: 'Bonnet' }, category: { slug: 'accessoires' } });
    expect(JSON.parse(JSON.stringify(product))).toEqual(product);
  });
  it('masque une catégorie archivée et tolère l’absence de photo', () => {
    const product = queries.toShopProduct(row({ category: { id: 'c1', name: 'X', slug: 'x', isArchived: true }, images: [] }) as never, NOW);
    expect(product.category).toBeNull();
    expect(product.image).toBeNull();
  });
});

describe('lectures publiques', () => {
  it('ne lisent que les produits PUBLIÉS', async () => {
    db.category.findMany.mockResolvedValue([]);
    db.product.findMany.mockResolvedValue([]);
    await queries.getShopData(NOW);
    expect((db.product.findMany.mock.calls[0]![0] as { where: unknown }).where).toEqual({ status: 'PUBLISHED' });
    expect((db.category.findMany.mock.calls[0]![0] as { where: unknown }).where).toEqual({ isArchived: false });
  });

  it('best-sellers : les produits mis en avant, sinon les plus récents', async () => {
    db.product.findMany.mockResolvedValueOnce([row()]);
    expect(await queries.getFeaturedProducts(8, NOW)).toHaveLength(1);
    expect(db.product.findMany).toHaveBeenCalledTimes(1);

    db.product.findMany.mockReset();
    db.product.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([row({ id: 'p9' })]);
    const fallback = await queries.getFeaturedProducts(8, NOW);
    expect(fallback.map((item) => item.id)).toEqual(['p9']);
    expect(db.product.findMany).toHaveBeenCalledTimes(2);
  });

  it('focus produit : masqué sans choix ou si le produit n’est plus publié', async () => {
    expect(await queries.getFocusProduct(null, NOW)).toBeNull();
    expect(db.product.findFirst).not.toHaveBeenCalled();
    db.product.findFirst.mockResolvedValue(null);
    expect(await queries.getFocusProduct('p1', NOW)).toBeNull();
    expect((db.product.findFirst.mock.calls[0]![0] as { where: unknown }).where).toEqual({ id: 'p1', status: 'PUBLISHED' });
  });

  it('trie par prix FACTURÉ (promotion comprise), pas par prix normal', async () => {
    db.product.findMany.mockResolvedValue([
      row({ id: 'a', price: 10000, salePrice: null }),
      row({ id: 'b', price: 12000, salePrice: 6000 }), // facturé 6000
      row({ id: 'c', price: 8000, salePrice: null }),
    ]);
    const asc = await queries.listShopProducts({ categorySlug: null, offers: false, sort: 'prix-croissant', query: '' }, NOW);
    expect(asc.map((item) => item.id)).toEqual(['b', 'c', 'a']);
    const desc = await queries.listShopProducts({ categorySlug: null, offers: false, sort: 'prix-decroissant', query: '' }, NOW);
    expect(desc.map((item) => item.id)).toEqual(['a', 'c', 'b']);
  });

  it('filtre les offres, la catégorie et la recherche côté base', async () => {
    db.product.findMany.mockResolvedValue([]);
    await queries.listShopProducts({ categorySlug: 'accessoires', offers: true, sort: 'defaut', query: 'bonnet' }, NOW);
    expect((db.product.findMany.mock.calls[0]![0] as { where: unknown }).where).toEqual({
      status: 'PUBLISHED',
      category: { slug: 'accessoires', isArchived: false },
      salePrice: { not: null },
      name: { contains: 'bonnet', mode: 'insensitive' },
    });
  });

  it('la fiche produit ne sort que pour un produit publié', async () => {
    db.product.findFirst.mockResolvedValue(null);
    expect(await queries.getProductPage('p1', NOW)).toBeNull();
    expect((db.product.findFirst.mock.calls[0]![0] as { where: unknown }).where).toEqual({ id: 'p1', status: 'PUBLISHED' });
  });
});

describe('navigation', () => {
  it('« Collections » n’existe que s’il y a une catégorie active avec un produit publié', async () => {
    db.category.count.mockResolvedValue(0);
    expect(await queries.hasCollections()).toBe(false);
    db.category.count.mockResolvedValue(2);
    expect(await queries.hasCollections()).toBe(true);
    expect((db.category.count.mock.calls[0]![0] as { where: unknown }).where).toEqual({ isArchived: false, products: { some: { status: 'PUBLISHED' } } });
  });
});

describe('réglages publics', () => {
  it('n’exposent jamais le numéro Wave ni l’email de notification', async () => {
    db.storeSettings.findUnique.mockResolvedValue({
      storeName: 'Awa Beauty', sellerWhatsApp: '+2250700000000', contactEmail: 'bonjour@awa.ci', contactPhone: null,
      instagramUrl: 'https://instagram.com/awa', tiktokUrl: null, facebookUrl: null, focusProductId: null, depositAmount: 2000,
    });
    const settings = await queries.getPublicSettings();
    expect(Object.keys(settings)).not.toContain('waveNumber');
    expect(Object.keys(settings)).not.toContain('notificationEmail');
    expect(settings.whatsappLink).toBe('https://wa.me/2250700000000');
    const select = (db.storeSettings.findUnique.mock.calls[0]![0] as { select: Record<string, boolean> }).select;
    expect(select).not.toHaveProperty('waveNumber');
    expect(select).not.toHaveProperty('notificationEmail');
  });
  it('masque un numéro WhatsApp provisoire (« À configurer »)', async () => {
    db.storeSettings.findUnique.mockResolvedValue({ storeName: 'X', sellerWhatsApp: 'À configurer', contactEmail: null, contactPhone: null, instagramUrl: null, tiktokUrl: null, facebookUrl: null, focusProductId: null, depositAmount: 2000 });
    const settings = await queries.getPublicSettings();
    expect(settings.whatsappLink).toBeNull();
    expect(settings.whatsappNumber).toBeNull();
  });
  it('retombent sur des valeurs par défaut sans ligne de réglages', async () => {
    db.storeSettings.findUnique.mockResolvedValue(null);
    expect((await queries.getPublicSettings()).storeName).toBe('Ma boutique');
  });
});

describe('build sans base (CI)', () => {
  it('SKIP_DB_AT_BUILD=1 rend des listes vides sans interroger la base', async () => {
    process.env.SKIP_DB_AT_BUILD = '1';
    expect(await queries.getShopData(NOW)).toEqual({ categories: [], products: [] });
    expect(await queries.getFeaturedProducts(8, NOW)).toEqual([]);
    expect(await queries.getProductPage('p1', NOW)).toBeNull();
    expect((await queries.getPublicSettings()).storeName).toBe('Ma boutique');
    expect(db.product.findMany).not.toHaveBeenCalled();
    expect(db.storeSettings.findUnique).not.toHaveBeenCalled();
  });
});

describe('couleurs des catégories pour le mini-jeu du footer', () => {
  it('lit les couleurs des catégories actives, dans l’ordre, sans celles qui n’en ont pas', async () => {
    db.category.findMany.mockResolvedValue([{ accentColor: '#f4a6c0' }, { accentColor: null }, { accentColor: '#b69bd6' }]);
    await expect(queries.getCategoryAccents()).resolves.toEqual(['#f4a6c0', '#b69bd6']);
  });
  it('ne lit que les catégories non archivées qui ont des produits PUBLIÉS', async () => {
    db.category.findMany.mockResolvedValue([]);
    await queries.getCategoryAccents();
    const args = db.category.findMany.mock.calls[0]![0] as { where: { isArchived: boolean; products: { some: Record<string, unknown> } }; select: Record<string, boolean> };
    expect(args.where.isArchived).toBe(false);
    expect(args.where.products.some).toMatchObject({ status: 'PUBLISHED' });
    expect(args.select).toEqual({ accentColor: true });
  });
  it('build sans base (CI) : liste vide, aucune requête', async () => {
    process.env.SKIP_DB_AT_BUILD = '1';
    await expect(queries.getCategoryAccents()).resolves.toEqual([]);
    expect(db.category.findMany).not.toHaveBeenCalled();
  });
});
