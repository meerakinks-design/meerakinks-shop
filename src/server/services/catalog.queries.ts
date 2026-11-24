import type { Prisma } from '@prisma/client';
import { STORE_SETTINGS_ID } from '@/lib/constants/store';
import { effectivePrice, isNewProduct } from '@/lib/shop/product-display';
import { whatsappLink } from '@/lib/shop/whatsapp';
import type { ShopCategory, ShopProduct } from '@/lib/shop/sections';
import type { ShopParams } from '@/lib/shop/search';
import { emptyZones, type PublicZones } from '@/lib/shop/zones';
import { prisma } from '@/server/db';

// Lectures PUBLIQUES du catalogue : jamais un brouillon, un produit archivé ou une catégorie archivée.
// Les données renvoyées sont sérialisables (pas de Date) : elles passent aux composants client.

/**
 * Build sans base de données (CI) : `SKIP_DB_AT_BUILD=1` rend des listes vides au lieu d'interroger la base.
 * NE PAS utiliser pour construire la version de production : les pages statiques doivent contenir le catalogue.
 */
const skipDatabase = () => process.env.SKIP_DB_AT_BUILD === '1';

const CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  price: true,
  salePrice: true,
  stock: true,
  publishedAt: true,
  category: { select: { id: true, name: true, slug: true, isArchived: true } },
  images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof CARD_SELECT }>;

export function toShopProduct(row: CardRow, now: Date = new Date()): ShopProduct {
  const image = row.images[0];
  const category = row.category && !row.category.isArchived ? row.category : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: row.price,
    salePrice: row.salePrice,
    stock: row.stock,
    isNew: isNewProduct(row.publishedAt, now),
    image: image ? { url: image.url, alt: image.alt } : null,
    category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
  };
}

const PUBLISHED = { status: 'PUBLISHED' } as const;

// ---------------------------------------------------------------------------
// Réglages publics (jamais le numéro Wave ni l'email de notification)
// ---------------------------------------------------------------------------

export interface PublicSettings {
  storeName: string;
  whatsappNumber: string | null;
  whatsappLink: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  focusProductId: string | null;
  depositAmount: number;
}

const DEFAULT_SETTINGS: PublicSettings = {
  storeName: 'MEËRA KINKS',
  whatsappNumber: null,
  whatsappLink: null,
  contactEmail: null,
  contactPhone: null,
  instagramUrl: null,
  tiktokUrl: null,
  facebookUrl: null,
  focusProductId: null,
  depositAmount: 2000,
};

export async function getPublicSettings(): Promise<PublicSettings> {
  if (skipDatabase()) return DEFAULT_SETTINGS;
  const settings = await prisma.storeSettings.findUnique({
    where: { id: STORE_SETTINGS_ID },
    select: {
      storeName: true,
      sellerWhatsApp: true,
      contactEmail: true,
      contactPhone: true,
      instagramUrl: true,
      tiktokUrl: true,
      facebookUrl: true,
      focusProductId: true,
      depositAmount: true,
    },
  });
  if (!settings) return DEFAULT_SETTINGS;
  const link = whatsappLink(settings.sellerWhatsApp);
  return {
    storeName: settings.storeName,
    whatsappNumber: link ? settings.sellerWhatsApp : null,
    whatsappLink: link,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    instagramUrl: settings.instagramUrl,
    tiktokUrl: settings.tiktokUrl,
    facebookUrl: settings.facebookUrl,
    focusProductId: settings.focusProductId,
    depositAmount: settings.depositAmount,
  };
}

/**
 * Zones desservies proposées dans le formulaire de commande (actives seulement). Un type sans zone = destination
 * saisie à la main, frais « à confirmer » : on n'invente aucune zone. Jamais le numéro Wave.
 */
export async function getPublicZones(): Promise<PublicZones> {
  const zones = emptyZones();
  if (skipDatabase()) return zones;
  const rows = await prisma.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, type: true, fee: true },
  });
  for (const row of rows) zones[row.type].push({ id: row.id, name: row.name, fee: row.fee });
  return zones;
}

// ---------------------------------------------------------------------------
// Navigation : on n'affiche un lien que si sa section existe (jamais de lien mort)
// ---------------------------------------------------------------------------

/** Y a-t-il au moins une catégorie active avec un produit publié ? Sinon la section Collections n'existe pas. */
export async function hasCollections(): Promise<boolean> {
  if (skipDatabase()) return false;
  const count = await prisma.category.count({ where: { isArchived: false, products: { some: PUBLISHED } } });
  return count > 0;
}

/** Couleurs des catégories actives (avec produits publiés) : les pots du mini-jeu du footer les reprennent (D-19). */
export async function getCategoryAccents(): Promise<string[]> {
  if (skipDatabase()) return [];
  const rows = await prisma.category.findMany({
    where: { isArchived: false, products: { some: PUBLISHED } },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: { accentColor: true },
  });
  return rows.map((row) => row.accentColor).filter((color): color is string => Boolean(color));
}

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------

export async function getShopData(now: Date = new Date()): Promise<{ categories: ShopCategory[]; products: ShopProduct[] }> {
  if (skipDatabase()) return { categories: [], products: [] };
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { isArchived: false },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, description: true, accentColor: true, position: true },
    }),
    prisma.product.findMany({
      where: PUBLISHED,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 500,
      select: CARD_SELECT,
    }),
  ]);
  return { categories, products: products.map((row) => toShopProduct(row, now)) };
}

/** Best-sellers : produits « mis en avant » (8 au plus) ; à défaut, les plus récemment publiés. */
export async function getFeaturedProducts(limit = 8, now: Date = new Date()): Promise<ShopProduct[]> {
  if (skipDatabase()) return [];
  const featured = await prisma.product.findMany({
    where: { ...PUBLISHED, isFeatured: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: limit,
    select: CARD_SELECT,
  });
  if (featured.length > 0) return featured.map((row) => toShopProduct(row, now));
  const latest = await prisma.product.findMany({
    where: PUBLISHED,
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: CARD_SELECT,
  });
  return latest.map((row) => toShopProduct(row, now));
}

export interface FocusProduct extends ShopProduct {
  description: string;
  characteristics: string[];
  usageAdvice: string | null;
}

/** Produit du focus : choisi dans les paramètres ; null (section masquée) s'il n'existe pas ou n'est plus publié. */
export async function getFocusProduct(focusProductId: string | null, now: Date = new Date()): Promise<FocusProduct | null> {
  if (skipDatabase() || !focusProductId) return null;
  const row = await prisma.product.findFirst({
    where: { id: focusProductId, ...PUBLISHED },
    select: { ...CARD_SELECT, description: true, characteristics: true, usageAdvice: true },
  });
  if (!row) return null;
  return { ...toShopProduct(row, now), description: row.description, characteristics: row.characteristics, usageAdvice: row.usageAdvice };
}

// ---------------------------------------------------------------------------
// /boutique, catégories, fiches
// ---------------------------------------------------------------------------

export async function listShopProducts(params: ShopParams, now: Date = new Date()): Promise<ShopProduct[]> {
  if (skipDatabase()) return [];
  const rows = await prisma.product.findMany({
    where: {
      ...PUBLISHED,
      ...(params.categorySlug ? { category: { slug: params.categorySlug, isArchived: false } } : {}),
      ...(params.offers ? { salePrice: { not: null } } : {}),
      ...(params.query ? { name: { contains: params.query, mode: 'insensitive' as const } } : {}),
    },
    orderBy: params.sort === 'nouveautes' ? [{ publishedAt: 'desc' }, { createdAt: 'desc' }] : [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: 500,
    select: CARD_SELECT,
  });
  let products = rows.map((row) => ({ ...toShopProduct(row, now), _regular: row.price, _sale: row.salePrice }));
  // Le tri par prix porte sur le prix FACTURÉ (promotion comprise) : Prisma ne sait pas trier sur « salePrice sinon price ».
  if (params.sort === 'prix-croissant' || params.sort === 'prix-decroissant') {
    const sign = params.sort === 'prix-croissant' ? 1 : -1;
    products = [...products].sort((a, b) => sign * (effectivePrice({ price: a._regular, salePrice: a._sale }) - effectivePrice({ price: b._regular, salePrice: b._sale })));
  }
  return products.map(({ _regular: _r, _sale: _s, ...product }) => product);
}

export async function listActiveCategories() {
  if (skipDatabase()) return [];
  return prisma.category.findMany({
    where: { isArchived: false, products: { some: PUBLISHED } },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, description: true, accentColor: true, position: true, _count: { select: { products: { where: PUBLISHED } } } },
  });
}

export async function getCategoryPage(id: string, now: Date = new Date()) {
  if (skipDatabase()) return null;
  const category = await prisma.category.findFirst({
    where: { id, isArchived: false },
    select: { id: true, name: true, slug: true, description: true, accentColor: true, position: true },
  });
  if (!category) return null;
  const rows = await prisma.product.findMany({
    where: { ...PUBLISHED, categoryId: id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: 500,
    select: CARD_SELECT,
  });
  return { category, products: rows.map((row) => toShopProduct(row, now)) };
}

export async function getProductPage(id: string, now: Date = new Date()) {
  if (skipDatabase()) return null;
  const row = await prisma.product.findFirst({
    where: { id, ...PUBLISHED },
    select: {
      ...CARD_SELECT,
      images: { orderBy: { position: 'asc' }, select: { url: true, alt: true } },
      description: true,
      characteristics: true,
      usageAdvice: true,
      weightGrams: true,
      sku: true,
      seoTitle: true,
      metaDescription: true,
      updatedAt: true,
      optionLabel: true,
      variants: { where: { isActive: true }, orderBy: { position: 'asc' }, select: { id: true, label: true, price: true, salePrice: true, stock: true } },
    },
  });
  if (!row) return null;
  return {
    ...toShopProduct(row, now),
    images: row.images,
    description: row.description,
    characteristics: row.characteristics,
    usageAdvice: row.usageAdvice,
    weightGrams: row.weightGrams,
    sku: row.sku,
    seoTitle: row.seoTitle,
    metaDescription: row.metaDescription,
    updatedAt: row.updatedAt.toISOString(),
    optionLabel: row.optionLabel,
    variants: row.variants,
  };
}

export async function getRelatedProducts(productId: string, categoryId: string | null, limit = 4, now: Date = new Date()): Promise<ShopProduct[]> {
  if (skipDatabase() || !categoryId) return [];
  const rows = await prisma.product.findMany({
    where: { ...PUBLISHED, categoryId, NOT: { id: productId } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: limit,
    select: CARD_SELECT,
  });
  return rows.map((row) => toShopProduct(row, now));
}

export async function listSitemapEntries() {
  if (skipDatabase()) return { products: [], categories: [] };
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: PUBLISHED, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isArchived: false, products: { some: PUBLISHED } }, select: { slug: true } }),
  ]);
  return { products, categories };
}
