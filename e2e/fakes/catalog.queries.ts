// Remplace src/server/services/catalog.queries.ts quand E2E_FAKE_DATA=1 (voir next.config.mjs) : mêmes exports, données fixes.
import { effectivePrice, isNewProduct } from '@/lib/shop/product-display';
import type { ShopCategory, ShopProduct } from '@/lib/shop/sections';
import type { ShopParams } from '@/lib/shop/search';
import { whatsappLink } from '@/lib/shop/whatsapp';
import { emptyZones, type PublicZones } from '@/lib/shop/zones';
import type { FocusProduct, PublicSettings } from '@/server/services/catalog.queries';
import { FIXTURE_CATEGORIES, FIXTURE_DEPOSIT, FIXTURE_PRODUCTS, FIXTURE_STORE_NAME, findCategory, findProduct, imageUrl, type FixtureProduct } from '../fixtures';

export type { FocusProduct, PublicSettings };

const toShop = (product: FixtureProduct, now: Date): ShopProduct => {
  const category = findCategory(product.categorySlug);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    salePrice: product.salePrice,
    stock: product.stock,
    isNew: isNewProduct(new Date(product.publishedAt), now),
    image: { url: imageUrl(product.slug, 0), alt: product.name },
    category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
  };
};

export const toShopProduct = toShop;

export async function getPublicSettings(): Promise<PublicSettings> {
  const link = whatsappLink('+2250700000000');
  return {
    storeName: FIXTURE_STORE_NAME,
    whatsappNumber: link ? '+2250700000000' : null,
    whatsappLink: link,
    contactEmail: 'contact@example.com',
    contactPhone: null,
    instagramUrl: 'https://www.instagram.com/example',
    tiktokUrl: null,
    facebookUrl: null,
    focusProductId: 'prod-creme',
    depositAmount: FIXTURE_DEPOSIT,
  };
}

export async function getPublicZones(): Promise<PublicZones> {
  const zones = emptyZones();
  zones.ABIDJAN.push({ id: 'zone-cocody', name: 'Cocody', fee: 1500 }, { id: 'zone-marcory', name: 'Marcory', fee: 1500 });
  return zones;
}

export async function hasCollections(): Promise<boolean> {
  return true;
}

export async function getShopData(now: Date = new Date()): Promise<{ categories: ShopCategory[]; products: ShopProduct[] }> {
  return { categories: FIXTURE_CATEGORIES.map(({ id, name, slug, description, accentColor, position }) => ({ id, name, slug, description, accentColor, position })), products: FIXTURE_PRODUCTS.map((p) => toShop(p, now)) };
}

export async function getFeaturedProducts(limit = 8, now: Date = new Date()): Promise<ShopProduct[]> {
  return FIXTURE_PRODUCTS.filter((p) => p.isFeatured).slice(0, limit).map((p) => toShop(p, now));
}

export async function getFocusProduct(focusProductId: string | null, now: Date = new Date()): Promise<FocusProduct | null> {
  const product = focusProductId ? findProduct(focusProductId) : undefined;
  if (!product) return null;
  return { ...toShop(product, now), description: product.description, characteristics: product.characteristics, usageAdvice: product.usageAdvice };
}

export async function listShopProducts(params: ShopParams, now: Date = new Date()): Promise<ShopProduct[]> {
  let list = FIXTURE_PRODUCTS.filter((p) => (params.categorySlug ? p.categorySlug === params.categorySlug : true) && (params.offers ? p.salePrice !== null : true) && (params.query ? p.name.toLowerCase().includes(params.query.toLowerCase()) : true));
  if (params.sort === 'prix-croissant') list = [...list].sort((a, b) => effectivePrice(a) - effectivePrice(b));
  if (params.sort === 'prix-decroissant') list = [...list].sort((a, b) => effectivePrice(b) - effectivePrice(a));
  return list.map((p) => toShop(p, now));
}

export async function listActiveCategories() {
  return FIXTURE_CATEGORIES.map(({ id, name, slug, description, accentColor, position }) => ({
    id,
    name,
    slug,
    description,
    accentColor,
    position,
    _count: { products: FIXTURE_PRODUCTS.filter((p) => p.categorySlug === slug).length },
  }));
}

export async function getCategoryPage(id: string, now: Date = new Date()) {
  const category = findCategory(id);
  if (!category) return null;
  const { id: categoryId, name, slug, description, accentColor, position } = category;
  return { category: { id: categoryId, name, slug, description, accentColor, position }, products: FIXTURE_PRODUCTS.filter((p) => p.categorySlug === slug).map((p) => toShop(p, now)) };
}

export async function getProductPage(id: string, now: Date = new Date()) {
  const product = findProduct(id);
  if (!product) return null;
  return {
    ...toShop(product, now),
    images: Array.from({ length: product.imageCount }, (_, index) => ({ url: imageUrl(product.slug, index), alt: `${product.name} — photo ${index + 1}` })),
    description: product.description,
    characteristics: product.characteristics,
    usageAdvice: product.usageAdvice,
    weightGrams: product.weightGrams,
    sku: null,
    seoTitle: null,
    metaDescription: null,
    updatedAt: product.publishedAt,
  };
}

export async function getRelatedProducts(productId: string, categoryId: string | null, limit = 4, now: Date = new Date()): Promise<ShopProduct[]> {
  if (!categoryId) return [];
  return FIXTURE_PRODUCTS.filter((p) => findCategory(p.categorySlug)?.id === categoryId && p.id !== productId).slice(0, limit).map((p) => toShop(p, now));
}

export async function listSitemapEntries() {
  return { products: FIXTURE_PRODUCTS.map((p) => ({ slug: p.slug, updatedAt: new Date(p.publishedAt) })), categories: FIXTURE_CATEGORIES.map((c) => ({ slug: c.slug })) };
}

export async function getCategoryAccents(): Promise<string[]> {
  return FIXTURE_CATEGORIES.map((category) => category.accentColor);
}
