// Données de démonstration du banc d'essai visuel (E2E_FAKE_DATA=1). Aucune base de données : tout est ici.
// Contenus génériques, sans marque ni produit réel.

export interface FixtureCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  accentColor: string;
  position: number;
}

export interface FixtureProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice: number | null;
  stock: number | null;
  categorySlug: string;
  imageCount: number;
  isFeatured: boolean;
  description: string;
  characteristics: string[];
  usageAdvice: string | null;
  weightGrams: number | null;
  publishedAt: string;
}

export const FIXTURE_STORE_NAME = 'Boutique test';
export const FIXTURE_DEPOSIT = 2000;
export const FIXTURE_REFERENCE = 'CMD-7K3M9QX2';

export const FIXTURE_CATEGORIES: FixtureCategory[] = [
  { id: 'cat-soins', name: 'Soins visage', slug: 'soins-visage', description: 'Hydrater, apaiser, révéler l’éclat.', accentColor: '#f4a6c0', position: 1 },
  { id: 'cat-maquillage', name: 'Maquillage', slug: 'maquillage', description: 'Teint, lèvres et regard.', accentColor: '#f2c94c', position: 2 },
  { id: 'cat-corps', name: 'Corps', slug: 'corps', description: 'Huiles et soins nourrissants.', accentColor: '#b69bd6', position: 3 },
];

const LONG_DESCRIPTION =
  'Une texture fondante qui se glisse dans la routine du matin comme du soir. Elle hydrate sans laisser de film gras et laisse la peau souple, confortable, prête pour la journée.\n\nPensée pour un usage quotidien, elle s’applique en quelques gestes, du bout des doigts, sur une peau propre.\n\nConservez le pot à l’abri de la chaleur et refermez-le après chaque utilisation.';

export const FIXTURE_PRODUCTS: FixtureProduct[] = [
  {
    id: 'prod-creme',
    slug: 'creme-hydratante-visage',
    name: 'Crème hydratante visage',
    price: 8500,
    salePrice: 6900,
    stock: 12,
    categorySlug: 'soins-visage',
    imageCount: 4,
    isFeatured: true,
    description: LONG_DESCRIPTION,
    characteristics: ['Pot de 50 ml', 'Texture légère', 'Convient à tous les types de peau'],
    usageAdvice: 'Appliquer matin et soir sur le visage et le cou, en massant doucement jusqu’à absorption.',
    weightGrams: 120,
    publishedAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'prod-serum',
    slug: 'serum-eclat',
    name: 'Sérum éclat',
    price: 12000,
    salePrice: null,
    stock: 3,
    categorySlug: 'soins-visage',
    imageCount: 2,
    isFeatured: true,
    description: LONG_DESCRIPTION,
    characteristics: ['Flacon compte-gouttes de 30 ml'],
    usageAdvice: null,
    weightGrams: 80,
    publishedAt: '2026-11-15T10:00:00.000Z',
  },
  {
    id: 'prod-gloss',
    slug: 'gloss-repulpant',
    name: 'Gloss repulpant',
    price: 4500,
    salePrice: null,
    stock: null,
    categorySlug: 'maquillage',
    imageCount: 1,
    isFeatured: false,
    description: LONG_DESCRIPTION,
    characteristics: ['Tube de 8 ml'],
    usageAdvice: null,
    weightGrams: null,
    publishedAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'prod-palette',
    slug: 'palette-teint',
    name: 'Palette teint',
    price: 9000,
    salePrice: null,
    stock: 0,
    categorySlug: 'maquillage',
    imageCount: 1,
    isFeatured: false,
    description: LONG_DESCRIPTION,
    characteristics: [],
    usageAdvice: null,
    weightGrams: null,
    publishedAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'prod-huile',
    slug: 'huile-corps-nourrissante',
    name: 'Huile corps nourrissante',
    price: 7000,
    salePrice: null,
    stock: 20,
    categorySlug: 'corps',
    imageCount: 3,
    isFeatured: true,
    description: LONG_DESCRIPTION,
    characteristics: ['Flacon pompe de 100 ml'],
    usageAdvice: 'Quelques gouttes sur peau légèrement humide.',
    weightGrams: 240,
    publishedAt: '2026-08-01T10:00:00.000Z',
  },
];

export const imageUrl = (slug: string, index: number): string => `https://res.cloudinary.com/e2e/image/upload/v1/${slug}-${index + 1}.jpg`;

export const findProduct = (key: string): FixtureProduct | undefined => FIXTURE_PRODUCTS.find((product) => product.id === key || product.slug === key);
export const findCategory = (key: string): FixtureCategory | undefined => FIXTURE_CATEGORIES.find((category) => category.id === key || category.slug === key);
