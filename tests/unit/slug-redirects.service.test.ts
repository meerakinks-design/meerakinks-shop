import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = {
  product: { findUnique: vi.fn() },
  category: { findUnique: vi.fn() },
  slugRedirect: { findUnique: vi.fn() },
};
vi.mock('@/server/db', () => ({ prisma: db }));
const { resolveProductSlug, resolveCategorySlug } = await import('@/server/services/slug-redirects.service');

beforeEach(() => {
  vi.clearAllMocks();
  db.product.findUnique.mockResolvedValue(null);
  db.category.findUnique.mockResolvedValue(null);
  db.slugRedirect.findUnique.mockResolvedValue(null);
});

describe('resolveProductSlug', () => {
  it('trouve un produit publié par son slug actuel', async () => {
    db.product.findUnique.mockResolvedValue({ id: 'p1', status: 'PUBLISHED' });
    expect(await resolveProductSlug('bonnet')).toEqual({ kind: 'found', id: 'p1' });
  });

  it('traite un brouillon ou un archivé comme inexistant pour le public', async () => {
    db.product.findUnique.mockResolvedValue({ id: 'p1', status: 'DRAFT' });
    expect(await resolveProductSlug('bonnet')).toEqual({ kind: 'missing' });
    db.product.findUnique.mockResolvedValue({ id: 'p1', status: 'ARCHIVED' });
    expect(await resolveProductSlug('bonnet')).toEqual({ kind: 'missing' });
  });

  it('redirige un ancien slug vers le slug ACTUEL du produit (jamais de chaîne)', async () => {
    db.slugRedirect.findUnique.mockResolvedValue({ product: { slug: 'bonnet-satin', status: 'PUBLISHED' } });
    expect(await resolveProductSlug('ancien-lien')).toEqual({ kind: 'redirect', slug: 'bonnet-satin' });
    expect(db.slugRedirect.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { entity_fromSlug: { entity: 'PRODUCT', fromSlug: 'ancien-lien' } } }));
  });

  it('ne redirige pas vers un produit qui n’est plus publié', async () => {
    db.slugRedirect.findUnique.mockResolvedValue({ product: { slug: 'bonnet-satin', status: 'ARCHIVED' } });
    expect(await resolveProductSlug('ancien-lien')).toEqual({ kind: 'missing' });
  });

  it('rend « missing » pour un lien inconnu', async () => {
    expect(await resolveProductSlug('nimporte-quoi')).toEqual({ kind: 'missing' });
  });
});

describe('resolveCategorySlug', () => {
  it('trouve une catégorie active, ignore une catégorie archivée', async () => {
    db.category.findUnique.mockResolvedValue({ id: 'c1', isArchived: false });
    expect(await resolveCategorySlug('soins')).toEqual({ kind: 'found', id: 'c1' });
    db.category.findUnique.mockResolvedValue({ id: 'c1', isArchived: true });
    expect(await resolveCategorySlug('soins')).toEqual({ kind: 'missing' });
  });

  it('redirige un ancien slug de catégorie vers le slug actuel', async () => {
    db.slugRedirect.findUnique.mockResolvedValue({ category: { slug: 'soins-capillaires', isArchived: false } });
    expect(await resolveCategorySlug('cheveux')).toEqual({ kind: 'redirect', slug: 'soins-capillaires' });
  });
});
