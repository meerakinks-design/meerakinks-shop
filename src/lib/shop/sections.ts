import { readableTextColor } from '@/lib/color';

// Construit l'affichage de la section « Boutique » de la landing (décision D-12) :
//  - s'il existe au moins une catégorie active avec un produit publié : une section par catégorie ;
//  - sinon : une grille de tous les produits.

export interface ShopProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice: number | null;
  stock: number | null;
  isNew: boolean;
  image: { url: string; alt: string } | null;
  category: { id: string; name: string; slug: string } | null;
}

export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  accentColor: string | null;
  position: number;
}

export interface CategorySection {
  category: ShopCategory;
  background: string;
  textColor: '#000000' | '#ffffff';
  products: ShopProduct[];
}

export type ShopLayout =
  | { mode: 'categories'; sections: CategorySection[]; others: ShopProduct[] }
  | { mode: 'grid'; products: ShopProduct[] };

// Couleurs PROVISOIRES quand une catégorie n'a pas de couleur : remplacées par la charte graphique (F0b).
export const FALLBACK_ACCENTS = ['#f4a6c0', '#f2c94c', '#b69bd6', '#b7d36b'] as const;

export function buildShopLayout(categories: readonly ShopCategory[], products: readonly ShopProduct[]): ShopLayout {
  const ordered = [...categories].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fr'));
  const byCategory = new Map<string, ShopProduct[]>();
  const others: ShopProduct[] = [];

  for (const product of products) {
    const categoryId = product.category?.id;
    if (categoryId && ordered.some((category) => category.id === categoryId)) {
      byCategory.set(categoryId, [...(byCategory.get(categoryId) ?? []), product]);
    } else {
      others.push(product);
    }
  }

  const sections: CategorySection[] = [];
  for (const category of ordered) {
    const inCategory = byCategory.get(category.id);
    if (!inCategory || inCategory.length === 0) continue; // une catégorie sans produit publié n'a pas de section
    const background = category.accentColor ?? FALLBACK_ACCENTS[sections.length % FALLBACK_ACCENTS.length]!;
    sections.push({ category, background, textColor: readableTextColor(background), products: inCategory });
  }

  if (sections.length === 0) return { mode: 'grid', products: [...products] };
  return { mode: 'categories', sections, others };
}
