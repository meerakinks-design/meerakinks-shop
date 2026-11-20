import { prisma } from '@/server/db';

export type SlugResolution =
  | { kind: 'found'; id: string }
  | { kind: 'redirect'; slug: string } // redirection PERMANENTE (308) vers le slug actuel
  | { kind: 'missing' };

/**
 * Résout l'adresse demandée pour une fiche produit : le slug actuel d'un produit publié,
 * ou, à défaut, l'ancien slug d'un produit publié (redirection). Un produit en brouillon ou
 * archivé n'existe pas pour le public.
 */
export async function resolveProductSlug(slug: string): Promise<SlugResolution> {
  const current = await prisma.product.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (current) return current.status === 'PUBLISHED' ? { kind: 'found', id: current.id } : { kind: 'missing' };

  const redirect = await prisma.slugRedirect.findUnique({
    where: { entity_fromSlug: { entity: 'PRODUCT', fromSlug: slug } },
    select: { product: { select: { slug: true, status: true } } },
  });
  if (redirect?.product && redirect.product.status === 'PUBLISHED') return { kind: 'redirect', slug: redirect.product.slug };
  return { kind: 'missing' };
}

/** Même chose pour une page catégorie (une catégorie archivée n'existe pas pour le public). */
export async function resolveCategorySlug(slug: string): Promise<SlugResolution> {
  const current = await prisma.category.findUnique({ where: { slug }, select: { id: true, isArchived: true } });
  if (current) return current.isArchived ? { kind: 'missing' } : { kind: 'found', id: current.id };

  const redirect = await prisma.slugRedirect.findUnique({
    where: { entity_fromSlug: { entity: 'CATEGORY', fromSlug: slug } },
    select: { category: { select: { slug: true, isArchived: true } } },
  });
  if (redirect?.category && !redirect.category.isArchived) return { kind: 'redirect', slug: redirect.category.slug };
  return { kind: 'missing' };
}
