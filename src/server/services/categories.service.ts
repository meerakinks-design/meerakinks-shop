import { Prisma } from '@prisma/client';
import { findFreeSlug, slugify } from '@/lib/slug';
import type { CategoryData } from '@/lib/validation/category.schema';
import { prisma } from '@/server/db';
import { HttpError } from '@/server/http';
import { revalidateCatalog } from '@/server/services/catalog-cache';

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      accentColor: true,
      position: true,
      isArchived: true,
      _count: { select: { products: true } },
    },
  });
}

/** Même règle que pour les produits : le slug d'une autre catégorie, ou son ancien slug, est indisponible. */
async function isCategorySlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const [category, redirect] = await Promise.all([
    prisma.category.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } }),
    prisma.slugRedirect.findFirst({
      where: { entity: 'CATEGORY', fromSlug: slug, ...(excludeId ? { NOT: { categoryId: excludeId } } : {}) },
      select: { id: true },
    }),
  ]);
  return category !== null || redirect !== null;
}

const slugTakenError = () =>
  new HttpError(409, 'CONFLICT', 'Ce lien est déjà utilisé.', { fields: { slug: ['Ce lien est déjà utilisé par une autre catégorie.'] } });

function rethrowKnownErrors(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw slugTakenError();
    if (error.code === 'P2025') throw new HttpError(404, 'NOT_FOUND', 'Catégorie introuvable.');
  }
  throw error;
}

export async function createCategory(data: CategoryData): Promise<{ id: string; slug: string }> {
  let slug: string;
  if (data.slug) {
    if (await isCategorySlugTaken(data.slug)) throw slugTakenError();
    slug = data.slug;
  } else {
    slug = await findFreeSlug(slugify(data.name), 'categorie', (candidate) => isCategorySlugTaken(candidate));
  }
  try {
    const category = await prisma.category.create({
      data: { name: data.name, slug, description: data.description, accentColor: data.accentColor, position: data.position, isArchived: data.isArchived },
      select: { id: true, slug: true },
    });
    revalidateCatalog({ categories: [category.slug] });
    return category;
  } catch (error) {
    return rethrowKnownErrors(error);
  }
}

export async function updateCategory(id: string, data: CategoryData): Promise<{ id: string; slug: string }> {
  const existing = await prisma.category.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Catégorie introuvable.');

  let slug = existing.slug;
  const slugChanged = Boolean(data.slug) && data.slug !== existing.slug;
  if (slugChanged && data.slug) {
    if (await isCategorySlugTaken(data.slug, id)) throw slugTakenError();
    slug = data.slug;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id },
        data: { name: data.name, slug, description: data.description, accentColor: data.accentColor, position: data.position, isArchived: data.isArchived },
      });
      if (slugChanged) {
        await tx.slugRedirect.deleteMany({ where: { entity: 'CATEGORY', fromSlug: slug } });
        await tx.slugRedirect.upsert({
          where: { entity_fromSlug: { entity: 'CATEGORY', fromSlug: existing.slug } },
          update: { categoryId: id },
          create: { entity: 'CATEGORY', fromSlug: existing.slug, categoryId: id },
        });
      }
    });
  } catch (error) {
    return rethrowKnownErrors(error);
  }
  revalidateCatalog({ categories: [slug, existing.slug] });
  return { id, slug };
}

/**
 * Archiver est le geste normal ; supprimer reste possible. Les produits de la catégorie supprimée
 * restent en ligne, simplement sans catégorie (onDelete: SetNull).
 */
export async function deleteCategory(id: string): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id }, select: { slug: true } });
  if (!category) throw new HttpError(404, 'NOT_FOUND', 'Catégorie introuvable.');
  try {
    await prisma.category.delete({ where: { id } });
  } catch (error) {
    return rethrowKnownErrors(error);
  }
  revalidateCatalog({ categories: [category.slug] });
}
