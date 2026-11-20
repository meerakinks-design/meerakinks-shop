import { Prisma } from '@prisma/client';
import type { ProductStatusValue } from '@/lib/constants/product';
import { findFreeSlug, slugify } from '@/lib/slug';
import type { ProductData } from '@/lib/validation/product.schema';
import { prisma } from '@/server/db';
import { HttpError } from '@/server/http';
import { deleteCloudinaryAssets, getCloudinaryConfig, isOwnCloudinaryImage } from '@/server/integrations/cloudinary';
import { revalidateCatalog } from '@/server/services/catalog-cache';

export interface AdminProductFilter {
  /** Sans statut : tous les produits SAUF les archivés (ils ont leur propre onglet). */
  status?: ProductStatusValue | undefined;
  query?: string | undefined;
}

// ---------------------------------------------------------------------------
// Lectures (back-office)
// ---------------------------------------------------------------------------

export async function listAdminProducts(filter: AdminProductFilter = {}) {
  const query = filter.query?.trim();
  return prisma.product.findMany({
    where: {
      status: filter.status ? filter.status : { not: 'ARCHIVED' },
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { sku: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      salePrice: true,
      stock: true,
      status: true,
      isFeatured: true,
      category: { select: { name: true } },
      images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
    },
  });
}

export async function getAdminProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      characteristics: true,
      usageAdvice: true,
      price: true,
      salePrice: true,
      weightGrams: true,
      sku: true,
      stock: true,
      status: true,
      isFeatured: true,
      seoTitle: true,
      metaDescription: true,
      sortOrder: true,
      categoryId: true,
      images: { orderBy: { position: 'asc' }, select: { url: true, publicId: true, alt: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Écritures
// ---------------------------------------------------------------------------

function assertImagesAreOurs(images: ProductData['images']): void {
  if (images.length === 0) return; // pas de photo : pas besoin que Cloudinary soit configuré
  const { cloudName } = getCloudinaryConfig();
  if (!images.every((image) => isOwnCloudinaryImage(image, cloudName))) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Une des photos n’est pas valide. Renvoie-la depuis le formulaire.', {
      fields: { images: ['Une des photos n’est pas valide. Renvoie-la depuis le formulaire.'] },
    });
  }
}

const slugTakenError = () =>
  new HttpError(409, 'CONFLICT', 'Ce lien est déjà utilisé.', { fields: { slug: ['Ce lien est déjà utilisé par un autre produit.'] } });

const skuTakenError = () =>
  new HttpError(409, 'CONFLICT', 'Cette référence est déjà utilisée.', { fields: { sku: ['Cette référence est déjà utilisée par un autre produit.'] } });

/**
 * Un slug est indisponible s'il est celui d'un AUTRE produit, ou l'ancien slug (redirection) d'un autre
 * produit : le réutiliser casserait les liens déjà partagés de celui-là. Le sien (redirection comprise)
 * reste libre : on peut revenir à un ancien lien.
 */
async function isProductSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const [product, redirect] = await Promise.all([
    prisma.product.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } }),
    prisma.slugRedirect.findFirst({
      where: { entity: 'PRODUCT', fromSlug: slug, ...(excludeId ? { NOT: { productId: excludeId } } : {}) },
      select: { id: true },
    }),
  ]);
  return product !== null || redirect !== null;
}

/** Deux requêtes simultanées peuvent passer les vérifications : les contraintes uniques de la base tranchent. */
function rethrowKnownErrors(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target.map(String) : typeof target === 'string' ? [target] : [];
      throw fields.some((field) => field.includes('sku')) ? skuTakenError() : slugTakenError();
    }
    if (error.code === 'P2003') {
      throw new HttpError(422, 'VALIDATION_ERROR', 'La catégorie choisie n’existe plus.', { fields: { categoryId: ['La catégorie choisie n’existe plus.'] } });
    }
    if (error.code === 'P2025') throw new HttpError(404, 'NOT_FOUND', 'Produit introuvable.');
  }
  throw error;
}

function scalarFields(data: ProductData) {
  return {
    name: data.name,
    description: data.description,
    characteristics: data.characteristics,
    usageAdvice: data.usageAdvice,
    price: data.price,
    salePrice: data.salePrice,
    weightGrams: data.weightGrams,
    sku: data.sku,
    stock: data.stock,
    status: data.status,
    isFeatured: data.isFeatured,
    seoTitle: data.seoTitle,
    metaDescription: data.metaDescription,
    sortOrder: data.sortOrder,
    categoryId: data.categoryId,
  };
}

/** Supprime chez Cloudinary les images qui ne sont plus référencées nulle part en base. */
async function deleteUnreferencedImages(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;
  const stillUsed = await prisma.productImage.findMany({ where: { publicId: { in: publicIds } }, select: { publicId: true } });
  const used = new Set(stillUsed.map((image) => image.publicId));
  await deleteCloudinaryAssets(publicIds.filter((publicId) => !used.has(publicId)));
}

export async function createProduct(data: ProductData): Promise<{ id: string; slug: string }> {
  assertImagesAreOurs(data.images);

  let slug: string;
  if (data.slug) {
    if (await isProductSlugTaken(data.slug)) throw slugTakenError();
    slug = data.slug;
  } else {
    slug = await findFreeSlug(slugify(data.name), 'produit', (candidate) => isProductSlugTaken(candidate));
  }

  try {
    const product = await prisma.product.create({
      data: {
        ...scalarFields(data),
        slug,
        // Première publication : la date est posée ici, et jamais modifiée ensuite.
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        images: { create: data.images.map((image, position) => ({ ...image, position })) },
      },
      select: { id: true, slug: true },
    });
    revalidateCatalog({ products: [product.slug] });
    return product;
  } catch (error) {
    return rethrowKnownErrors(error);
  }
}

export async function updateProduct(id: string, data: ProductData): Promise<{ id: string; slug: string }> {
  assertImagesAreOurs(data.images);

  const existing = await prisma.product.findUnique({
    where: { id },
    select: { slug: true, status: true, publishedAt: true, images: { select: { publicId: true } } },
  });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Produit introuvable.');

  let slug = existing.slug;
  const slugChanged = Boolean(data.slug) && data.slug !== existing.slug;
  if (slugChanged && data.slug) {
    if (await isProductSlugTaken(data.slug, id)) throw slugTakenError();
    slug = data.slug;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...scalarFields(data),
          slug,
          // On garde la date de première publication ; elle n'est posée que la première fois.
          publishedAt: existing.publishedAt ?? (data.status === 'PUBLISHED' ? new Date() : null),
        },
      });
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (data.images.length > 0) {
        await tx.productImage.createMany({ data: data.images.map((image, position) => ({ ...image, productId: id, position })) });
      }
      if (slugChanged) {
        // Retour à un ancien lien : il n'a plus à rediriger.
        await tx.slugRedirect.deleteMany({ where: { entity: 'PRODUCT', fromSlug: slug } });
        // Un produit déjà publié (ou archivé) a pu être partagé ou référencé : son ancien lien redirige.
        if (existing.status !== 'DRAFT') {
          await tx.slugRedirect.upsert({
            where: { entity_fromSlug: { entity: 'PRODUCT', fromSlug: existing.slug } },
            update: { productId: id },
            create: { entity: 'PRODUCT', fromSlug: existing.slug, productId: id },
          });
        }
      }
    });
  } catch (error) {
    return rethrowKnownErrors(error);
  }

  // Après la transaction : une panne de Cloudinary ne doit pas annuler l'enregistrement.
  const kept = new Set(data.images.map((image) => image.publicId));
  await deleteUnreferencedImages(existing.images.map((image) => image.publicId).filter((publicId) => !kept.has(publicId)));

  revalidateCatalog({ products: [slug, existing.slug] });
  return { id, slug };
}

export async function deleteProduct(id: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { slug: true, images: { select: { publicId: true } }, _count: { select: { orderItems: true } } },
  });
  if (!product) throw new HttpError(404, 'NOT_FOUND', 'Produit introuvable.');
  if (product._count.orderItems > 0) {
    throw new HttpError(409, 'CONFLICT', 'Ce produit figure dans des commandes : archive-le plutôt que de le supprimer.');
  }

  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    return rethrowKnownErrors(error);
  }
  await deleteUnreferencedImages(product.images.map((image) => image.publicId));
  revalidateCatalog({ products: [product.slug] });
}
