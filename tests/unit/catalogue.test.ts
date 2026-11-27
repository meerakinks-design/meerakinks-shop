import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUNDLES, CATALOGUE, CATALOGUE_CATEGORIES, COMMON, GAMMES, PRODUCTS } from '@/content/catalogue';
import {
  COMPLETE_RANGE_SLUG,
  SEED_ROWS,
  SHOP_ORDER,
  bundlePricing,
  canReplaceImages,
  completeRange,
  componentsOf,
  displayPricing,
  duoOf,
  findEntry,
  planSeed,
  precautionFlags,
  showcaseGroups,
  toSeedRow,
  toShowcaseCard,
} from '@/lib/shop/catalogue';
import { productInputSchema } from '@/lib/validation/product.schema';
import { SLUG_PATTERN } from '@/lib/slug';

const PUBLIC_DIR = path.resolve(__dirname, '../../public');
const byName = (name: string) => PRODUCTS.find((product) => product.name === name)!;

describe('catalogue : conformité au dossier produit v1.1', () => {
  it('compte six produits, trois duos et une gamme complète, dans l’ordre voulu : chaque produit, les duos, la gamme', () => {
    expect(PRODUCTS.map((p) => p.name)).toEqual(['Mousse Kinky', 'Elixir Wunter', 'SLIK', 'Brume', 'Fluffy Kinks', 'Velvet']);
    expect(BUNDLES.map((b) => b.name)).toEqual(['Duo jaune', 'Duo orange', 'Duo marron', 'Gamme Kinks complète']);
    expect(CATALOGUE.map((entry) => entry.category)).toEqual([...Array(6).fill('produits'), ...Array(3).fill('duos'), 'gamme-complete']);
  });

  it('affiche les soins dans l’ordre de la vitrine (Fluffy Kinks en tête), puis les duos, puis la gamme complète', () => {
    expect(SHOP_ORDER.map((entry) => entry.name)).toEqual([
      'Fluffy Kinks', 'SLIK', 'Mousse Kinky', 'Velvet', 'Elixir Wunter', 'Brume', 'Duo jaune', 'Duo orange', 'Duo marron', 'Gamme Kinks complète',
    ]);
    expect(CATALOGUE.map((entry) => entry.sortOrder).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('reprend les identifiants (slugs) du dossier', () => {
    expect(CATALOGUE.map((entry) => entry.slug)).toEqual([
      'mousse-kinky', 'elixir-wunter', 'slik', 'brume', 'fluffy-kinks', 'velvet', 'duo-jaune', 'duo-orange', 'duo-marron', 'gamme-kinks-complete',
    ]);
    for (const entry of CATALOGUE) expect(entry.slug, entry.slug).toMatch(SLUG_PATTERN);
  });

  it('reprend les prix, contenances et sous-titres de la vue d’ensemble', () => {
    expect(PRODUCTS.map((p) => [p.name, p.kind, p.size, p.price])).toEqual([
      ['Mousse Kinky', 'Shampoing ambunu & shikakai', '250 ml', 6000],
      ['Elixir Wunter', 'Huile de croissance capillaire', '50 ml', 4500],
      ['SLIK', 'Lait capillaire ultra hydratant', '250 ml', 6000],
      ['Brume', 'Spray capillaire hydratant', '200 ml', 6000],
      ['Fluffy Kinks', 'Chantilly capillaire', '120 g', 4000],
      ['Velvet', 'Masque capillaire nourrissant', '250 ml', 8000],
    ]);
  });

  it('range les produits par couleur : jaune = lavage et pousse, orange = hydratation, marron = nutrition', () => {
    expect(PRODUCTS.map((p) => p.gamme)).toEqual(['jaune', 'jaune', 'orange', 'orange', 'marron', 'marron']);
    expect(GAMMES.jaune.need).toBe('lavage et pousse');
    expect(GAMMES.orange.need).toBe('hydratation');
    expect(GAMMES.marron.need).toBe('nutrition');
    expect(Object.keys(GAMMES)).toHaveLength(3); // pas d'autre déclinaison de couleur
  });

  describe('prix des offres : ancien prix = somme des prix séparés ; économie = différence', () => {
    it.each([
      ['duo-jaune', 10500, 10000, 500],
      ['duo-orange', 12000, 11500, 500],
      ['duo-marron', 12000, 11500, 500],
      [COMPLETE_RANGE_SLUG, 34500, 32500, 2000],
    ])('%s : ancien prix %i, prix réel %i, économie %i', (slug, regular, price, saving) => {
      const bundle = BUNDLES.find((item) => item.slug === slug)!;
      expect(bundlePricing(bundle)).toEqual({ regular, price, saving });
    });

    it('chaque offre est moins chère que l’achat séparé', () => {
      for (const bundle of BUNDLES) expect(bundlePricing(bundle).saving, bundle.slug).toBeGreaterThan(0);
    });
  });

  it('compose chaque duo de deux produits de sa couleur, et la gamme complète des six produits', () => {
    expect(BUNDLES.filter((b) => b.type === 'duo').map((b) => componentsOf(b).map((p) => p.name))).toEqual([
      ['Mousse Kinky', 'Elixir Wunter'],
      ['SLIK', 'Brume'],
      ['Fluffy Kinks', 'Velvet'],
    ]);
    for (const duo of BUNDLES.filter((b) => b.type === 'duo')) for (const product of componentsOf(duo)) expect(product.gamme).toBe(duo.gamme);
    expect(componentsOf(completeRange()).map((p) => p.name)).toEqual(PRODUCTS.map((p) => p.name));
    expect(duoOf(byName('Velvet')).slug).toBe('duo-marron');
  });

  it('reprend le nombre d’étapes, de précautions et d’ingrédients de chaque fiche', () => {
    const counts = Object.fromEntries(PRODUCTS.map((p) => [p.name, [p.usage.length, p.precautions.length, p.inci.length]]));
    expect(counts).toEqual({
      'Mousse Kinky': [2, 2, 14],
      'Elixir Wunter': [5, 5, 14],
      SLIK: [4, 4, 16],
      Brume: [4, 3, 11],
      'Fluffy Kinks': [4, 5, 10],
      Velvet: [3, 3, 16],
    });
    expect(byName('Mousse Kinky').inci[0]).toBe('Aqua');
    expect(byName('Elixir Wunter').inci[0]).toBe('Simmondsia Chinensis Seed Oil');
    expect(byName('Fluffy Kinks').inci.at(-1)).toBe('Parfum');
  });

  it('retrouve la matrice « Précautions selon nos produits » (page 11 du dossier)', () => {
    const flags = (name: string) => Object.values(precautionFlags(byName(name)));
    expect(flags('Mousse Kinky')).toEqual([false, false, false, false]);
    expect(flags('Elixir Wunter')).toEqual([true, true, true, true]);
    expect(flags('SLIK')).toEqual([true, false, true, false]);
    expect(flags('Brume')).toEqual([false, false, false, false]);
    expect(flags('Fluffy Kinks')).toEqual([true, true, true, true]);
    expect(flags('Velvet')).toEqual([true, false, false, false]);
  });

  it('applique la précaution commune (usage externe, yeux) aux six produits', () => {
    for (const product of PRODUCTS) {
      expect(product.precautions[0], product.name).toBe('Usage externe.');
      expect(product.precautions.some((line) => /yeux/.test(line)), product.name).toBe(true);
    }
    expect(COMMON.commonPrecaution).toBe('Usage externe et éviter le contact avec les yeux.');
    expect(COMMON.shelfLife).toBe('12 mois après ouverture');
  });

  it('écrit la marque avec le tréma et le nom exact de l’huile (Wunter, pas Winter)', () => {
    const text = JSON.stringify(CATALOGUE);
    expect(text).not.toMatch(/Meera/);
    expect(text).not.toMatch(/Winter/);
    expect(text).toContain('Meëra Kinks');
  });

  it('ne met aucun prix dans les textes : le prix vit dans la base, pas dans la description', () => {
    for (const entry of CATALOGUE) {
      const copy = [entry.description, entry.seoTitle, entry.metaDescription].join(' ');
      expect(copy, entry.slug).not.toMatch(/FCFA|F CFA|\d\s?\d{3}\s?(?:F|XOF)/);
    }
  });

  describe('photos', () => {
    it('chaque photo existe dans public/products et porte un texte alternatif', () => {
      for (const entry of CATALOGUE) {
        for (const image of entry.images) {
          expect(existsSync(path.join(PUBLIC_DIR, 'products', image.file)), `${image.file} est absente de public/products`).toBe(true);
          expect(image.alt.trim().length, image.file).toBeGreaterThan(10);
        }
      }
    });

    it('chaque offre et chaque produit a sa photo principale ; les duos jaune et orange en ont deux', () => {
      expect(CATALOGUE.every((entry) => entry.images.length >= 1)).toBe(true);
      expect(findEntry('duo-jaune')!.images).toHaveLength(2);
      expect(findEntry('duo-orange')!.images).toHaveLength(2);
      expect(findEntry('duo-marron')!.images).toHaveLength(1);
      expect(findEntry(COMPLETE_RANGE_SLUG)!.images).toHaveLength(1);
    });

    it('n’utilise jamais deux fois le même fichier', () => {
      const files = CATALOGUE.flatMap((entry) => entry.images.map((image) => image.file));
      expect(new Set(files).size).toBe(files.length);
    });
  });
});

describe('catalogue : lignes enregistrées en base', () => {
  it('un produit seul garde son prix, sans prix promotionnel', () => {
    const row = toSeedRow(byName('Velvet'));
    expect(row).toMatchObject({ slug: 'velvet', price: 8000, salePrice: null, categorySlug: 'produits' });
  });

  it('une offre enregistre l’ancien prix comme prix normal et le prix réel comme prix promotionnel', () => {
    expect(toSeedRow(findEntry('duo-jaune')!)).toMatchObject({ price: 10500, salePrice: 10000, categorySlug: 'duos' });
    expect(toSeedRow(findEntry('duo-orange')!)).toMatchObject({ price: 12000, salePrice: 11500 });
    expect(toSeedRow(findEntry('duo-marron')!)).toMatchObject({ price: 12000, salePrice: 11500 });
    expect(toSeedRow(findEntry(COMPLETE_RANGE_SLUG)!)).toMatchObject({ price: 34500, salePrice: 32500, categorySlug: 'gamme-complete' });
  });

  it('donne à chaque photo un identifiant propre au dossier des photos de produits du back-office', () => {
    for (const row of SEED_ROWS) {
      for (const image of row.images) {
        expect(image.publicId).toMatch(/^boutique\/products\/[a-z0-9-]+$/);
        expect(image.path).toBe(`/products/${image.file}`);
      }
    }
  });

  it('est acceptée telle quelle par le formulaire du back-office (limites de longueur, prix promotionnel < prix)', () => {
    for (const row of SEED_ROWS) {
      const parsed = productInputSchema.safeParse({
        name: row.name,
        slug: row.slug,
        categoryId: 'cat_1',
        description: row.description,
        characteristics: row.characteristics,
        usageAdvice: row.usageAdvice,
        price: row.price,
        salePrice: row.salePrice,
        stock: null,
        status: 'PUBLISHED',
        isFeatured: false,
        seoTitle: row.seoTitle,
        metaDescription: row.metaDescription,
        sortOrder: row.sortOrder,
        images: row.images.map((image) => ({ url: `https://res.cloudinary.com/demo/image/upload/v1/${image.publicId}.webp`, publicId: image.publicId, alt: image.alt })),
      });
      expect(parsed.success, `${row.slug} : ${parsed.success ? '' : JSON.stringify(parsed.error.flatten())}`).toBe(true);
    }
  });

  it('range les produits dans trois catégories ordonnées : nos soins, nos duos, la gamme complète', () => {
    expect(CATALOGUE_CATEGORIES.map((c) => [c.slug, c.position])).toEqual([['produits', 1], ['duos', 2], ['gamme-complete', 3]]);
    for (const category of CATALOGUE_CATEGORIES) expect(category.accentColor).toMatch(/^#[0-9A-F]{6}$/);
    for (const entry of CATALOGUE) expect(CATALOGUE_CATEGORIES.some((c) => c.slug === entry.category)).toBe(true);
  });
});

describe('vitrine : cartes et groupes', () => {
  it('décrit un soin par son sous-titre et sa contenance, une offre par son contenu et son besoin', () => {
    expect(toShowcaseCard(byName('Velvet'))).toMatchObject({ slug: 'velvet', kind: 'Masque capillaire nourrissant', meta: '250 ml', gamme: 'marron', isOffer: false });
    expect(toShowcaseCard(findEntry('duo-jaune')!)).toMatchObject({ kind: 'Mousse Kinky + Elixir Wunter', meta: 'Offre duo · Lavage & pousse', gamme: 'jaune', isOffer: true });
    expect(toShowcaseCard(findEntry(COMPLETE_RANGE_SLUG)!)).toMatchObject({ meta: 'Offre · 6 soins', gamme: null, isOffer: true });
  });

  it('prend la première photo de la fiche pour la carte', () => {
    expect(toShowcaseCard(byName('Fluffy Kinks')).image.src).toBe('/products/fluffy-kinks-1.webp');
    expect(toShowcaseCard(findEntry('duo-orange')!).image.src).toBe('/products/duo-orange-1.webp');
  });

  it('forme trois groupes : chaque soin (6), les duos (3), la gamme complète (1)', () => {
    const groups = showcaseGroups();
    expect(groups.map((group) => [group.key, group.name, group.cards.length])).toEqual([
      ['produits', 'Nos soins', 6],
      ['duos', 'Nos duos', 3],
      ['gamme-complete', 'La gamme complète', 1],
    ]);
    expect(groups[0]!.cards.map((card) => card.slug)).toEqual(['fluffy-kinks', 'slik', 'mousse-kinky', 'velvet', 'elixir-wunter', 'brume']);
    expect(groups[1]!.cards.map((card) => card.slug)).toEqual(['duo-jaune', 'duo-orange', 'duo-marron']);
  });

  it('n’a pas de groupe vide', () => {
    expect(showcaseGroups(PRODUCTS).map((group) => group.key)).toEqual(['produits']);
    expect(showcaseGroups([])).toEqual([]);
  });

  it('affiche le prix : un seul pour un soin ; ancien prix, prix réel et économie pour une offre', () => {
    expect(displayPricing(byName('Velvet'))).toEqual({ price: 8000, regular: null, saving: 0 });
    expect(displayPricing(findEntry('duo-jaune')!)).toEqual({ price: 10000, regular: 10500, saving: 500 });
    expect(displayPricing(findEntry(COMPLETE_RANGE_SLUG)!)).toEqual({ price: 32500, regular: 34500, saving: 2000 });
  });
});

describe('seed : plan d’exécution', () => {
  it('crée tout sur une base vide', () => {
    const plan = planSeed([], false);
    expect(plan.create).toHaveLength(10);
    expect(plan.update).toHaveLength(0);
    expect(plan.keep).toHaveLength(0);
  });

  it('par défaut, ne touche à aucun produit déjà présent (ce que la vendeuse a modifié n’est jamais écrasé)', () => {
    const plan = planSeed(['velvet', 'duo-jaune'], false);
    expect(plan.create.map((row) => row.slug)).not.toContain('velvet');
    expect(plan.keep.map((row) => row.slug)).toEqual(['velvet', 'duo-jaune']);
    expect(plan.update).toHaveLength(0);
    expect(plan.create).toHaveLength(8);
  });

  it('avec --sync, réaligne les produits présents et crée les absents', () => {
    const plan = planSeed(['velvet'], true);
    expect(plan.update.map((row) => row.slug)).toEqual(['velvet']);
    expect(plan.keep).toHaveLength(0);
    expect(plan.create).toHaveLength(9);
  });

  it('est relançable : une deuxième exécution ne crée rien', () => {
    const all = SEED_ROWS.map((row) => row.slug);
    expect(planSeed(all, false).create).toHaveLength(0);
  });

  it('remplace les photos seulement si elles viennent du seed (ou s’il n’y en a pas), jamais celles de la vendeuse', () => {
    const velvet = toSeedRow(byName('Velvet'));
    const seedIds = velvet.images.map((image) => image.publicId);
    expect(canReplaceImages([], velvet)).toBe(true);
    expect(canReplaceImages(seedIds, velvet)).toBe(true);
    expect(canReplaceImages([...seedIds, 'boutique/products/photo-de-la-vendeuse'], velvet)).toBe(false);
  });
});
