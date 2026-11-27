// Fonctions pures autour du catalogue Meëra Kinks (src/content/catalogue.ts) : prix des offres, composition, précautions,
// lignes à enregistrer en base, cartes de la vitrine. Aucune lecture de base ni de fichier : tout se teste sans serveur.

import {
  BUNDLES,
  CATALOGUE,
  CATALOGUE_CATEGORIES,
  CATALOGUE_IMAGE_DIR,
  COMMON,
  GAMMES,
  PRODUCTS,
  type CatalogueBundle,
  type CatalogueCategorySlug,
  type CatalogueEntry,
  type CatalogueImage,
  type CatalogueProduct,
  type Gamme,
  type GammeKey,
} from '@/content/catalogue';

// ---------------------------------------------------------------------------
// Recherche
// ---------------------------------------------------------------------------

/** Identifiant (slug) de la gamme complète : l'offre qui réunit les six produits. */
export const COMPLETE_RANGE_SLUG = 'gamme-kinks-complete';

const BY_SLUG: ReadonlyMap<string, CatalogueEntry> = new Map(CATALOGUE.map((entry) => [entry.slug, entry]));

export const findEntry = (slug: string): CatalogueEntry | undefined => BY_SLUG.get(slug);
export const isBundle = (entry: CatalogueEntry): entry is CatalogueBundle => entry.type !== 'produit';
export const isProduct = (entry: CatalogueEntry): entry is CatalogueProduct => entry.type === 'produit';

/** Les produits réunis par une offre, dans l'ordre du dossier. */
export function componentsOf(bundle: CatalogueBundle): CatalogueProduct[] {
  return bundle.contains.map((slug) => {
    const entry = BY_SLUG.get(slug);
    if (!entry || !isProduct(entry)) throw new Error(`Offre « ${bundle.slug} » : « ${slug} » n'est pas un produit du catalogue.`);
    return entry;
  });
}

/** Le duo de la couleur d'un produit (jaune → duo jaune…). */
export function duoOf(product: CatalogueProduct): CatalogueBundle {
  const duo = BY_SLUG.get(GAMMES[product.gamme].duoSlug);
  if (!duo || !isBundle(duo)) throw new Error(`Aucun duo pour la couleur « ${product.gamme} ».`);
  return duo;
}

export function completeRange(): CatalogueBundle {
  const range = BY_SLUG.get(COMPLETE_RANGE_SLUG);
  if (!range || !isBundle(range)) throw new Error('La gamme complète est absente du catalogue.');
  return range;
}

// ---------------------------------------------------------------------------
// Prix des offres (règle du dossier : ancien prix = somme des prix séparés ; économie = différence avec le prix réel)
// ---------------------------------------------------------------------------

export interface BundlePricing {
  /** Ancien prix : somme des prix des produits achetés séparément. */
  regular: number;
  /** Prix réel de l'offre. */
  price: number;
  /** Économie : ancien prix moins prix réel. */
  saving: number;
}

export function bundlePricing(bundle: CatalogueBundle): BundlePricing {
  const regular = componentsOf(bundle).reduce((sum, product) => sum + product.price, 0);
  return { regular, price: bundle.price, saving: regular - bundle.price };
}

/** Prix tels que la fiche les affiche : un soin seul n'a qu'un prix ; une offre a un ancien prix (à barrer), le prix réel et l'économie. */
export interface DisplayPricing {
  price: number;
  regular: number | null;
  saving: number;
}

export function displayPricing(entry: CatalogueEntry): DisplayPricing {
  if (isProduct(entry)) return { price: entry.price, regular: null, saving: 0 };
  const { regular, price, saving } = bundlePricing(entry);
  return { price, regular, saving };
}

// ---------------------------------------------------------------------------
// Libellés
// ---------------------------------------------------------------------------

/** « Gamme jaune · lavage et pousse » (étiquette de page du dossier). */
export const gammeLabel = (gamme: Gamme): string => `Gamme ${gamme.label.toLowerCase()} · ${gamme.need}`;

/** Chemin public d'une photo du catalogue (public/products). */
export const imagePath = (image: CatalogueImage): string => `${CATALOGUE_IMAGE_DIR}/${image.file}`;

/** Identifiant Cloudinary d'une photo du catalogue, dans le dossier réservé aux photos de produits du back-office. */
export const imagePublicId = (image: CatalogueImage): string => `boutique/products/${image.file.replace(/\.[a-z0-9]+$/i, '')}`;

const sizeOf = (product: CatalogueProduct): string => `${product.name} (${product.size})`;

// ---------------------------------------------------------------------------
// Précautions : la matrice du dossier (« Précautions selon nos produits ») se lit dans le texte des précautions
// ---------------------------------------------------------------------------

export interface PrecautionFlags {
  wristTest: boolean;
  doNotSwallow: boolean;
  heatShelter: boolean;
  lightShelter: boolean;
}

export const PRECAUTION_COLUMNS: ReadonlyArray<{ key: keyof PrecautionFlags; label: string }> = [
  { key: 'wristTest', label: 'Test au poignet' },
  { key: 'doNotSwallow', label: 'Ne pas avaler' },
  { key: 'heatShelter', label: 'Abri de la chaleur' },
  { key: 'lightShelter', label: 'Abri de la lumière' },
];

export function precautionFlags(product: CatalogueProduct): PrecautionFlags {
  const text = product.precautions.join(' ');
  return {
    wristTest: /test sur le poignet/i.test(text),
    doNotSwallow: /ne pas avaler/i.test(text),
    heatShelter: /abri de la chaleur/i.test(text),
    lightShelter: /lumière/i.test(text),
  };
}

// ---------------------------------------------------------------------------
// Ce qui part en base (npm run db:seed:catalogue)
// ---------------------------------------------------------------------------

/** Une ligne de la base : respecte les limites du formulaire du back-office (voir productInputSchema). */
export interface CatalogueSeedRow {
  slug: string;
  name: string;
  description: string;
  characteristics: string[];
  usageAdvice: string | null;
  /** Prix normal : pour une offre, l'ancien prix (somme des prix séparés). */
  price: number;
  /** Prix promotionnel : pour une offre, le prix réel ; null pour un produit seul. */
  salePrice: number | null;
  seoTitle: string;
  metaDescription: string;
  sortOrder: number;
  categorySlug: CatalogueCategorySlug;
  images: Array<{ file: string; alt: string; path: string; publicId: string }>;
}

export function buildCharacteristics(entry: CatalogueEntry): string[] {
  if (isProduct(entry)) {
    return [
      `Contenance : ${entry.size}`,
      `Type : ${entry.productType}`,
      `Bienfaits : ${entry.benefits}`,
      `Gamme : ${GAMMES[entry.gamme].label} · ${GAMMES[entry.gamme].need}`,
      `Conservation : PAO ${COMMON.shelfLife}`,
      `Fabrication : ${COMMON.madeIn}`,
    ];
  }
  const contents = componentsOf(entry).map(sizeOf).join(' + ');
  return [
    `Besoin : ${entry.need}`,
    `Contenu : ${contents}`,
    entry.gamme ? `Gamme : ${GAMMES[entry.gamme].label} · ${GAMMES[entry.gamme].need}` : 'Couleurs : jaune, orange et marron',
    `Fabrication : ${COMMON.madeIn}`,
  ];
}

/** Mode d'emploi à plat (« 1. … 2. … ») pour le champ « conseils d'utilisation » de la base. Une offre n'en a pas : chaque soin a le sien. */
export function buildUsageAdvice(entry: CatalogueEntry): string | null {
  if (!isProduct(entry)) return null;
  return entry.usage.map((step, index) => `${index + 1}. ${step}`).join(' ');
}

export function toSeedRow(entry: CatalogueEntry): CatalogueSeedRow {
  const pricing = isBundle(entry) ? bundlePricing(entry) : null;
  return {
    slug: entry.slug,
    name: entry.name,
    description: entry.description,
    characteristics: buildCharacteristics(entry),
    usageAdvice: buildUsageAdvice(entry),
    price: pricing ? pricing.regular : entry.price,
    salePrice: pricing ? pricing.price : null,
    seoTitle: entry.seoTitle,
    metaDescription: entry.metaDescription,
    sortOrder: entry.sortOrder,
    categorySlug: entry.category,
    images: entry.images.map((image) => ({ file: image.file, alt: image.alt, path: imagePath(image), publicId: imagePublicId(image) })),
  };
}

export const SEED_ROWS: readonly CatalogueSeedRow[] = CATALOGUE.map(toSeedRow);
export { CATALOGUE_CATEGORIES };

export interface SeedPlan {
  /** Produits absents de la base : à créer. */
  create: CatalogueSeedRow[];
  /** Produits présents, réalignés sur le dossier (mode --sync seulement). */
  update: CatalogueSeedRow[];
  /** Produits présents, laissés tels quels (comportement par défaut : on n'écrase jamais ce que la vendeuse a modifié). */
  keep: CatalogueSeedRow[];
}

/** Décide, produit par produit, ce que le seed fait. Fonction pure : le seed ne fait ensuite qu'exécuter ce plan. */
export function planSeed(existingSlugs: Iterable<string>, sync: boolean, rows: readonly CatalogueSeedRow[] = SEED_ROWS): SeedPlan {
  const existing = new Set(existingSlugs);
  const plan: SeedPlan = { create: [], update: [], keep: [] };
  for (const row of rows) {
    if (!existing.has(row.slug)) plan.create.push(row);
    else if (sync) plan.update.push(row);
    else plan.keep.push(row);
  }
  return plan;
}

/**
 * Le seed remplace les photos d'un produit existant seulement si elles viennent du seed (ou s'il n'en a aucune) :
 * des photos envoyées depuis le back-office par la vendeuse ne sont jamais écrasées.
 */
export function canReplaceImages(existingPublicIds: readonly string[], row: CatalogueSeedRow): boolean {
  const owned = new Set(row.images.map((image) => image.publicId));
  return existingPublicIds.every((publicId) => owned.has(publicId));
}

// ---------------------------------------------------------------------------
// Vitrine : les cartes de la boutique, groupées (chaque soin, puis les duos, puis la gamme complète)
// ---------------------------------------------------------------------------

export interface ShowcaseCardData {
  slug: string;
  name: string;
  /** Sous-titre (étiquette) : « Shampoing ambunu & shikakai », « Mousse Kinky + Elixir Wunter »… */
  kind: string;
  /** Ligne discrète sous le sous-titre : la contenance d'un soin, « Offre duo · Lavage & pousse » pour une offre. */
  meta: string;
  /** Couleur du soin ou du duo (pastille) ; null pour la gamme complète. */
  gamme: GammeKey | null;
  isOffer: boolean;
  /** Photo de la carte : la première de la fiche. Les autres défilent en slide sur la fiche. */
  image: { src: string; alt: string };
}

export interface ShowcaseGroup {
  key: CatalogueCategorySlug;
  name: string;
  description: string;
  cards: ShowcaseCardData[];
}

export function toShowcaseCard(entry: CatalogueEntry): ShowcaseCardData {
  const [first] = entry.images;
  const image = { src: imagePath(first), alt: first.alt };
  if (isProduct(entry)) return { slug: entry.slug, name: entry.name, kind: entry.kind, meta: entry.size, gamme: entry.gamme, isOffer: false, image };
  const meta = entry.type === 'duo' ? `Offre duo · ${entry.need}` : `Offre · ${entry.contains.length} soins`;
  return { slug: entry.slug, name: entry.name, kind: entry.kind, meta, gamme: entry.gamme, isOffer: true, image };
}

/** Toute la boutique dans l'ordre d'affichage (champ `sortOrder`) : Fluffy Kinks en tête, puis les duos, puis la gamme complète. */
export const SHOP_ORDER: readonly CatalogueEntry[] = [...CATALOGUE].sort((a, b) => a.sortOrder - b.sortOrder);

/** Les trois groupes de la boutique, dans l'ordre des catégories ; un groupe sans fiche n'existe pas. */
export function showcaseGroups(entries: readonly CatalogueEntry[] = SHOP_ORDER): ShowcaseGroup[] {
  return [...CATALOGUE_CATEGORIES]
    .sort((a, b) => a.position - b.position)
    .map((category) => ({
      key: category.slug,
      name: category.name,
      description: category.description,
      cards: entries.filter((entry) => entry.category === category.slug).map(toShowcaseCard),
    }))
    .filter((group) => group.cards.length > 0);
}

export { BUNDLES, PRODUCTS };
