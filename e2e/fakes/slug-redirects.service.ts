import type { SlugResolution } from '@/server/services/slug-redirects.service';
import { findCategory, findProduct } from '../fixtures';

export type { SlugResolution };

export async function resolveProductSlug(slug: string): Promise<SlugResolution> {
  const product = findProduct(slug);
  return product ? { kind: 'found', id: product.id } : { kind: 'missing' };
}

export async function resolveCategorySlug(slug: string): Promise<SlugResolution> {
  const category = findCategory(slug);
  return category ? { kind: 'found', id: category.id } : { kind: 'missing' };
}
