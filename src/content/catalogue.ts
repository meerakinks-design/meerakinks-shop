// Catalogue Meëra Kinks — transcription du « Dossier produit » v1.1 (25 novembre 2026) : 6 produits, 3 duos, 1 gamme complète.
//
// Ce fichier est la référence de la VITRINE (grille de la boutique et fiches /produit/<id>) et des INFORMATIONS DE FICHE : nom,
// sous-titre, contenance, bienfaits, mode d'emploi, précautions, ingrédients (INCI), conservation, composition des offres, photos
// et prix. Rien n'y est inventé : chaque ligne vient du dossier ou de l'étiquette.
//
// Tant que la vitrine est active (SHOWCASE_ENABLED, src/content/vitrine.ts), la boutique et les fiches se lisent ICI, sans base de
// données : les prix affichés sont ceux de ce fichier. Au passage au catalogue de la base, `npm run db:seed:catalogue` y recopie ces
// produits et ces prix ; ensuite la base fait foi (back-office) et seules les informations de fiche (mode d'emploi, précautions,
// ingrédients) continuent de venir d'ici.
//
// Règles du dossier reprises ici :
//  - un produit seul : un seul prix ; un duo ou la gamme complète : ancien prix barré d'un seul trait, puis prix réel mis en évidence ;
//  - l'ancien prix est la somme des prix des produits achetés séparément ; l'économie est la différence avec le prix réel
//    (voir `bundlePricing` dans src/lib/shop/catalogue.ts) ;
//  - un code couleur : jaune = lavage et pousse, orange = hydratation, marron = nutrition. Pas d'autre déclinaison de couleur.

export const CATALOGUE_VERSION = 'Dossier produit v1.1 (25 novembre 2026)';

/** Mentions qui figurent sur toutes les étiquettes (dossier, page « Informations communes »). */
export const COMMON = {
  brand: 'Meëra Kinks',
  slogan: 'Embrassez vos kinks !',
  madeIn: 'Made in Côte d’Ivoire',
  contactEmail: 'meerakinks@gmail.com',
  /** PAO : durée d'utilisation après ouverture, identique sur les six produits. */
  shelfLife: '12 mois après ouverture',
  /** Précaution commune aux six produits. */
  commonPrecaution: 'Usage externe et éviter le contact avec les yeux.',
} as const;

// ---------------------------------------------------------------------------
// Code couleur
// ---------------------------------------------------------------------------

export type GammeKey = 'jaune' | 'orange' | 'marron';

export interface Gamme {
  key: GammeKey;
  /** « Jaune », « Orange », « Marron ». */
  label: string;
  /** Besoin couvert, tel qu'écrit dans le dossier (« lavage et pousse »). */
  need: string;
  /** Variable CSS de la charte pour la pastille de cette couleur (voir tokens.css). */
  cssVar: string;
  /** Identifiant du duo de la couleur. */
  duoSlug: string;
}

export const GAMMES: Readonly<Record<GammeKey, Gamme>> = {
  jaune: { key: 'jaune', label: 'Jaune', need: 'lavage et pousse', cssVar: 'var(--color-gold-orange)', duoSlug: 'duo-jaune' },
  orange: { key: 'orange', label: 'Orange', need: 'hydratation', cssVar: 'var(--color-orange)', duoSlug: 'duo-orange' },
  marron: { key: 'marron', label: 'Marron', need: 'nutrition', cssVar: 'var(--color-brown)', duoSlug: 'duo-marron' },
};

export const GAMME_KEYS: readonly GammeKey[] = ['jaune', 'orange', 'marron'];

// ---------------------------------------------------------------------------
// Catégories de la boutique : chaque produit, puis les duos, puis la gamme complète
// ---------------------------------------------------------------------------

export type CatalogueCategorySlug = 'produits' | 'duos' | 'gamme-complete';

export interface CatalogueCategory {
  slug: CatalogueCategorySlug;
  name: string;
  description: string;
  /** Couleur de la section sur la landing (palette de la charte v1.2). */
  accentColor: string;
  position: number;
}

export const CATALOGUE_CATEGORIES: readonly CatalogueCategory[] = [
  { slug: 'produits', name: 'Nos soins', description: 'Chaque soin Meëra Kinks, à l’unité.', accentColor: '#F47C26', position: 1 },
  { slug: 'duos', name: 'Nos duos', description: 'Un besoin, deux soins : jaune, orange ou marron.', accentColor: '#FF9500', position: 2 },
  { slug: 'gamme-complete', name: 'La gamme complète', description: 'Les six soins réunis.', accentColor: '#7F3F20', position: 3 },
];

// ---------------------------------------------------------------------------
// Types des fiches
// ---------------------------------------------------------------------------

export interface CatalogueImage {
  /** Nom du fichier dans public/products/. */
  file: string;
  alt: string;
}

interface CatalogueBase {
  slug: string;
  name: string;
  /** Sous-titre tel qu'écrit sur l'étiquette ou dans le dossier. */
  kind: string;
  /** Texte de la fiche (paragraphes séparés par une ligne vide). Sans prix : le prix vit dans la base. */
  description: string;
  seoTitle: string;
  metaDescription: string;
  /** Prix réel facturé, en FCFA (dossier). Sert à la base et aux tests, jamais à l'affichage. */
  price: number;
  /** Ordre dans la boutique (1 = premier) : celui de la vitrine, Fluffy Kinks en tête, puis les duos, puis la gamme complète. */
  sortOrder: number;
  category: CatalogueCategorySlug;
  /** La première photo est la photo principale. */
  images: readonly [CatalogueImage, ...CatalogueImage[]];
}

export interface CatalogueProduct extends CatalogueBase {
  type: 'produit';
  gamme: GammeKey;
  /** Contenance, telle qu'écrite sur l'étiquette (« 250 ml », « 120 g »). */
  size: string;
  /** Type de produit (« Shampoing », « Huile capillaire »…). */
  productType: string;
  benefits: string;
  usage: readonly string[];
  precautions: readonly string[];
  /** Ingrédients, dans l'ordre de l'étiquette. */
  inci: readonly string[];
}

export interface CatalogueBundle extends CatalogueBase {
  type: 'duo' | 'gamme';
  /** Gamme couleur du duo ; null pour la gamme complète (les trois couleurs). */
  gamme: GammeKey | null;
  /** Besoin de l'offre, tel qu'écrit dans le dossier (« Lavage & pousse »). */
  need: string;
  /** Identifiants des produits réunis, dans l'ordre du dossier. */
  contains: readonly string[];
}

export type CatalogueEntry = CatalogueProduct | CatalogueBundle;

// ---------------------------------------------------------------------------
// Les six produits (pages 5 à 10 du dossier)
// ---------------------------------------------------------------------------

export const PRODUCTS: readonly CatalogueProduct[] = [
  {
    type: 'produit',
    slug: 'mousse-kinky',
    name: 'Mousse Kinky',
    kind: 'Shampoing ambunu & shikakai',
    gamme: 'jaune',
    size: '250 ml',
    productType: 'Shampoing',
    benefits: 'Nettoyant et démêlant',
    price: 6000,
    sortOrder: 3,
    category: 'produits',
    description:
      'Mousse Kinky est le shampoing ambunu & shikakai de Meëra Kinks, nettoyant et démêlant. Il se masse sur cheveux mouillés, puis se rince à l’eau.\n\nIl fait partie de la gamme jaune, « lavage et pousse », et forme le duo jaune avec Elixir Wunter. Fabriqué en Côte d’Ivoire.',
    seoTitle: 'Mousse Kinky, shampoing ambunu & shikakai',
    metaDescription: 'Mousse Kinky : shampoing ambunu & shikakai Meëra Kinks, nettoyant et démêlant. 250 ml, fabriqué en Côte d’Ivoire.',
    images: [{ file: 'mousse-kinky-1.webp', alt: 'Flacon pompe de Mousse Kinky, shampoing ambunu et shikakai Meëra Kinks, 250 ml.' }],
    usage: ['Appliquer sur cheveux mouillés et masser le cuir chevelu.', 'Rincer à l’eau.'],
    precautions: ['Usage externe.', 'Éviter le contact avec les yeux.'],
    inci: [
      'Aqua', 'Decyl Glucoside', 'Acacia Concinna Fruit Powder', 'Ceratotheca Sesamoides Leaf Extract', 'Glycerin', 'Niacinamide', 'Panthenol',
      'Hydrolyzed Silk', 'Olea Europaea Fruit Oil', 'Parfum', 'Dehydroacetic Acid', 'Benzyl Alcohol', 'Lactic Acid', 'Xanthan Gum',
    ],
  },
  {
    type: 'produit',
    slug: 'elixir-wunter',
    name: 'Elixir Wunter',
    kind: 'Huile de croissance capillaire',
    gamme: 'jaune',
    size: '50 ml',
    productType: 'Huile capillaire',
    benefits: 'Stimulante et fortifiante',
    price: 4500,
    sortOrder: 5,
    category: 'produits',
    description:
      'Elixir Wunter est l’huile de croissance capillaire de Meëra Kinks, stimulante et fortifiante. Elle se masse sur le cuir chevelu et peut aussi s’appliquer sur les longueurs et les pointes, sans rinçage.\n\nIl fait partie de la gamme jaune, « lavage et pousse », et forme le duo jaune avec Mousse Kinky. Fabriqué en Côte d’Ivoire.',
    seoTitle: 'Elixir Wunter, huile de croissance capillaire',
    metaDescription: 'Elixir Wunter : huile de croissance capillaire Meëra Kinks, stimulante et fortifiante. 50 ml, fabriquée en Côte d’Ivoire.',
    images: [
      { file: 'elixir-wunter-1.webp', alt: 'Flacon compte-gouttes d’Elixir Wunter, huile de croissance capillaire Meëra Kinks, 50 ml.' },
      { file: 'elixir-wunter-2.webp', alt: 'Une goutte d’huile tombe de la pipette dans le flacon d’Elixir Wunter.' },
    ],
    usage: [
      'Appliquer quelques gouttes sur le cuir chevelu propre, sec ou légèrement humide.',
      'Masser du bout des doigts pendant 2 à 5 minutes.',
      'Peut aussi s’appliquer sur les longueurs et les pointes.',
      'Ne pas rincer.',
      'Utiliser 2 à 3 fois par semaine.',
    ],
    precautions: [
      'Usage externe.',
      'Ne pas avaler.',
      'Éviter le contact avec les yeux.',
      'Faire un test sur le poignet avant la première utilisation.',
      'Conserver à l’abri de la chaleur et de la lumière.',
    ],
    inci: [
      'Simmondsia Chinensis Seed Oil', 'Olea Europaea Fruit Oil', 'Eclipta Prostrata Extract', 'Syzygium Aromaticum Flower Powder', 'Ricinus Communis Seed Oil',
      'Nigella Sativa Seed Extract', 'Tocopherol', 'Cananga Odorata Flower Oil', 'Benzyl Benzoate', 'Benzyl Salicylate', 'Farnesol', 'Geraniol', 'Linalool', 'Eugenol',
    ],
  },
  {
    type: 'produit',
    slug: 'slik',
    name: 'SLIK',
    kind: 'Lait capillaire ultra hydratant',
    gamme: 'orange',
    size: '250 ml',
    productType: 'Lait capillaire',
    benefits: 'Assouplissement et facilitation du démêlage',
    price: 6000,
    sortOrder: 2,
    category: 'produits',
    description:
      'SLIK est le lait capillaire ultra hydratant de Meëra Kinks : il assouplit et facilite le démêlage. Il s’applique section par section sur cheveux humides, sans rinçage.\n\nIl fait partie de la gamme orange, « hydratation », et forme le duo orange avec Brume. Fabriqué en Côte d’Ivoire.',
    seoTitle: 'SLIK, lait capillaire ultra hydratant',
    metaDescription: 'SLIK : lait capillaire ultra hydratant Meëra Kinks, pour assouplir et faciliter le démêlage. 250 ml, fabriqué en Côte d’Ivoire.',
    images: [{ file: 'slik-1.webp', alt: 'Flacon de SLIK, lait capillaire ultra hydratant Meëra Kinks, 250 ml.' }],
    usage: ['Bien mélanger avant usage.', 'Appliquer sur cheveux humides, section par section.', 'Coiffer comme d’habitude.', 'Ne pas rincer.'],
    precautions: [
      'Usage externe.',
      'Éviter le contact avec les yeux, rincer abondamment en cas de contact.',
      'Faire un test sur le poignet avant la première utilisation.',
      'Conserver à l’abri de la chaleur.',
    ],
    inci: [
      'Aqua', 'Ceratotheca Sesamoides Leaf Extract', 'Aloe Barbadensis Leaf Juice', 'Glycerin', 'Behentrimonium Methosulfate', 'Cetyl Alcohol', 'Butylene Glycol',
      'Butyrospermum Parkii Butter', 'Adansonia Digitata Seed Oil', 'Panthenol', 'Hydroxypropyltrimonium Honey', 'Xanthan Gum', 'Parfum', 'Dehydroacetic Acid',
      'Benzyl Alcohol', 'Lactic Acid',
    ],
  },
  {
    type: 'produit',
    slug: 'brume',
    name: 'Brume',
    kind: 'Spray capillaire hydratant',
    gamme: 'orange',
    size: '200 ml',
    productType: 'Spray capillaire',
    benefits: 'Hydratation, rafraîchissement et souplesse',
    price: 6000,
    sortOrder: 6,
    category: 'produits',
    description:
      'Brume est le spray capillaire hydratant de Meëra Kinks : hydratation, rafraîchissement et souplesse. Il se vaporise section par section sur cheveux humides ou secs, sans rinçage.\n\nIl fait partie de la gamme orange, « hydratation », et forme le duo orange avec SLIK. Fabriqué en Côte d’Ivoire.',
    seoTitle: 'Brume, spray capillaire hydratant',
    metaDescription: 'Brume : spray capillaire hydratant Meëra Kinks pour l’hydratation, le rafraîchissement et la souplesse. 200 ml, fabriqué en Côte d’Ivoire.',
    images: [{ file: 'brume-1.webp', alt: 'Flacon spray de Brume, spray capillaire hydratant Meëra Kinks, 200 ml.' }],
    usage: ['Agiter avant usage.', 'Vaporiser section par section sur cheveux humides ou secs.', 'Démêler.', 'Ne pas rincer.'],
    precautions: ['Usage externe.', 'Éviter le contact avec les yeux.', 'À ne pas rincer.'],
    inci: [
      'Aqua', 'Ceratotheca Sesamoides Leaf Juice', 'Glycerin', 'Aloe Barbadensis Leaf Juice', 'Panthenol', 'Hydrolyzed Silk', 'Parfum', 'Lactic Acid',
      'Dehydroacetic Acid', 'Benzyl Alcohol', 'Xanthan Gum',
    ],
  },
  {
    type: 'produit',
    slug: 'fluffy-kinks',
    name: 'Fluffy Kinks',
    kind: 'Chantilly capillaire',
    gamme: 'marron',
    size: '120 g',
    productType: 'Chantilly capillaire',
    benefits: 'Nutrition, scellage et brillance',
    price: 4000,
    sortOrder: 1,
    category: 'produits',
    description:
      'Fluffy Kinks est la chantilly capillaire de Meëra Kinks : nutrition, scellage et brillance. On prélève une noisette, on la réchauffe entre les mains, puis on l’applique sur cheveux secs ou humides, sans rinçage.\n\nElle fait partie de la gamme marron, « nutrition », et forme le duo marron avec Velvet. Fabriquée en Côte d’Ivoire.',
    seoTitle: 'Fluffy Kinks, chantilly capillaire',
    metaDescription: 'Fluffy Kinks : chantilly capillaire Meëra Kinks pour la nutrition, le scellage et la brillance. 120 g, fabriquée en Côte d’Ivoire.',
    images: [
      { file: 'fluffy-kinks-1.webp', alt: 'Pot de Fluffy Kinks, chantilly capillaire Meëra Kinks, 120 g.' },
      { file: 'fluffy-kinks-2.webp', alt: 'Le pot de Fluffy Kinks ouvert, avec sa chantilly blanche.' },
    ],
    usage: [
      'Prélever une noisette et la réchauffer entre les mains.',
      'Appliquer sur cheveux secs ou humides.',
      'Ne pas rincer.',
      'Utiliser 2 à 3 fois par semaine.',
    ],
    precautions: [
      'Usage externe.',
      'Ne pas avaler.',
      'Éviter le contact avec les yeux.',
      'Faire un test sur le poignet avant la première utilisation.',
      'Conserver à l’abri de la chaleur et de la lumière.',
    ],
    inci: [
      'Butyrospermum Parkii Butter', 'Theobroma Cacao Seed Butter', 'Persea Gratissima Oil', 'Olea Europaea Fruit Oil', 'Psidium Guajava Leaf Extract',
      'Phyllanthus Emblica Fruit Extract', 'Cocos Nucifera Oil', 'Zingiber Officinale Root Extract', 'Tocopherol', 'Parfum',
    ],
  },
  {
    type: 'produit',
    slug: 'velvet',
    name: 'Velvet',
    kind: 'Masque capillaire nourrissant',
    gamme: 'marron',
    size: '250 ml',
    productType: 'Masque capillaire',
    benefits: 'Hydratation, assouplissement et renforcement',
    price: 8000,
    sortOrder: 4,
    category: 'produits',
    description:
      'Velvet est le masque capillaire nourrissant de Meëra Kinks : hydratation, assouplissement et renforcement. Après le shampoing, il s’applique sur cheveux mouillés, des pointes vers les racines, se laisse poser 10 à 20 minutes, puis se rince à l’eau.\n\nIl fait partie de la gamme marron, « nutrition », et forme le duo marron avec Fluffy Kinks. Fabriqué en Côte d’Ivoire.',
    seoTitle: 'Velvet, masque capillaire nourrissant',
    metaDescription: 'Velvet : masque capillaire nourrissant Meëra Kinks pour l’hydratation, l’assouplissement et le renforcement. 250 ml, fabriqué en Côte d’Ivoire.',
    images: [
      { file: 'velvet-1.webp', alt: 'Pot de Velvet, masque capillaire nourrissant Meëra Kinks, 250 ml.' },
      { file: 'velvet-2.webp', alt: 'Le pot de Velvet ouvert, sur le côté, avec sa crème couleur ivoire.' },
    ],
    usage: [
      'Après le shampoing, appliquer sur cheveux mouillés, des pointes vers les racines.',
      'Laisser poser 10 à 20 minutes.',
      'Rincer à l’eau.',
    ],
    precautions: [
      'Usage externe.',
      'Éviter le contact avec les yeux, rincer abondamment en cas de contact.',
      'Faire un test sur le poignet avant la première utilisation.',
    ],
    inci: [
      'Aqua', 'Hibiscus Sabdariffa Flower Extract', 'Aloe Barbadensis Leaf Juice', 'Glycerin', 'Behentrimonium Methosulfate', 'Cetyl Alcohol', 'Butylene Glycol',
      'Butyrospermum Parkii Butter', 'Persea Gratissima Oil', 'Panthenol', 'Xanthan Gum', 'Curcuma Longa Root Powder', 'Parfum', 'Dehydroacetic Acid',
      'Benzyl Alcohol', 'Lactic Acid',
    ],
  },
];

// ---------------------------------------------------------------------------
// Les trois duos et la gamme complète (page 3 du dossier)
// ---------------------------------------------------------------------------

export const BUNDLES: readonly CatalogueBundle[] = [
  {
    type: 'duo',
    slug: 'duo-jaune',
    name: 'Duo jaune',
    kind: 'Mousse Kinky + Elixir Wunter',
    gamme: 'jaune',
    need: 'Lavage & pousse',
    contains: ['mousse-kinky', 'elixir-wunter'],
    price: 10000,
    sortOrder: 7,
    category: 'duos',
    description:
      'Le duo jaune réunit Mousse Kinky, le shampoing ambunu & shikakai, et Elixir Wunter, l’huile de croissance capillaire : lavage et pousse.',
    seoTitle: 'Duo jaune : Mousse Kinky + Elixir Wunter',
    metaDescription: 'Le duo jaune Meëra Kinks réunit Mousse Kinky et Elixir Wunter pour le lavage et la pousse, à un prix réduit par rapport à l’achat séparé.',
    images: [
      { file: 'duo-jaune-1.webp', alt: 'Duo jaune Meëra Kinks : Elixir Wunter, huile de croissance capillaire, à côté de Mousse Kinky, shampoing ambunu et shikakai.' },
      { file: 'duo-jaune-2.webp', alt: 'Une goutte d’Elixir Wunter tombe de la pipette, devant le flacon pompe de Mousse Kinky.' },
    ],
  },
  {
    type: 'duo',
    slug: 'duo-orange',
    name: 'Duo orange',
    kind: 'SLIK + Brume',
    gamme: 'orange',
    need: 'Hydratation',
    contains: ['slik', 'brume'],
    price: 11500,
    sortOrder: 8,
    category: 'duos',
    description:
      'Le duo orange réunit SLIK, le lait capillaire ultra hydratant, et Brume, le spray capillaire hydratant : hydratation.',
    seoTitle: 'Duo orange : SLIK + Brume',
    metaDescription: 'Le duo orange Meëra Kinks réunit SLIK et Brume pour l’hydratation, à un prix réduit par rapport à l’achat séparé.',
    images: [
      { file: 'duo-orange-1.webp', alt: 'Duo orange Meëra Kinks : le flacon de SLIK, lait capillaire, et Brume, spray capillaire, posé à plat.' },
      { file: 'duo-orange-2.webp', alt: 'Brume vaporise sa fine brume à côté du flacon de SLIK.' },
    ],
  },
  {
    type: 'duo',
    slug: 'duo-marron',
    name: 'Duo marron',
    kind: 'Fluffy Kinks + Velvet',
    gamme: 'marron',
    need: 'Nutrition intense',
    contains: ['fluffy-kinks', 'velvet'],
    price: 11500,
    sortOrder: 9,
    category: 'duos',
    description:
      'Le duo marron réunit Fluffy Kinks, la chantilly capillaire, et Velvet, le masque capillaire nourrissant : nutrition intense.',
    seoTitle: 'Duo marron : Fluffy Kinks + Velvet',
    metaDescription: 'Le duo marron Meëra Kinks réunit Fluffy Kinks et Velvet pour une nutrition intense, à un prix réduit par rapport à l’achat séparé.',
    images: [{ file: 'duo-marron-1.webp', alt: 'Duo marron Meëra Kinks : le pot de Fluffy Kinks posé sur le pot de Velvet, devant une cabosse de cacao et un hibiscus.' }],
  },
  {
    type: 'gamme',
    slug: 'gamme-kinks-complete',
    name: 'Gamme Kinks complète',
    kind: 'Nos six produits Meëra Kinks',
    gamme: null,
    need: 'Nos six produits Meëra Kinks',
    contains: ['mousse-kinky', 'elixir-wunter', 'slik', 'brume', 'fluffy-kinks', 'velvet'],
    price: 32500,
    sortOrder: 10,
    category: 'gamme-complete',
    description:
      'La gamme Kinks complète réunit les six produits Meëra Kinks : Mousse Kinky, Elixir Wunter, SLIK, Brume, Fluffy Kinks et Velvet, soit les trois couleurs, jaune, orange et marron.',
    seoTitle: 'Gamme Kinks complète : les six soins Meëra Kinks',
    metaDescription: 'La gamme Kinks complète réunit les six soins Meëra Kinks : Mousse Kinky, Elixir Wunter, SLIK, Brume, Fluffy Kinks et Velvet, à un prix réduit.',
    images: [{ file: 'gamme-kinks-complete-1.webp', alt: 'La gamme Kinks complète Meëra Kinks : Mousse Kinky, SLIK, Brume, Velvet, Elixir Wunter et Fluffy Kinks réunis.' }],
  },
];

/** Toute la boutique, dans l'ordre voulu : chaque produit, puis les duos, puis la gamme complète. */
export const CATALOGUE: readonly CatalogueEntry[] = [...PRODUCTS, ...BUNDLES];

/** Dossier de public/ où vivent les photos. */
export const CATALOGUE_IMAGE_DIR = '/products';
