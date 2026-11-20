import { revalidatePath } from 'next/cache';
import { PUBLIC_ROUTES, categoryPath, productPath } from '@/lib/constants/routes';

type MaybeSlug = string | null | undefined;

/**
 * Rafraîchit les pages publiques après une modification dans le back-office.
 * On passe aussi l'ANCIEN slug quand il change : sa redirection doit rester à jour.
 */
export function revalidateCatalog(options: { products?: MaybeSlug[]; categories?: MaybeSlug[] } = {}): void {
  revalidatePath(PUBLIC_ROUTES.home);
  revalidatePath(PUBLIC_ROUTES.shop);
  revalidatePath(PUBLIC_ROUTES.categories);
  for (const slug of new Set(options.products ?? [])) if (slug) revalidatePath(productPath(slug));
  for (const slug of new Set(options.categories ?? [])) if (slug) revalidatePath(categoryPath(slug));
}
