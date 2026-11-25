// Vitrine photo de la boutique (étape 1 : les images). Les prix, les descriptions et les fiches produit arrivent à l'étape suivante.
//
// Tant que SHOWCASE_ENABLED vaut true, /boutique et la section « Boutique » de la landing affichent ces six soins
// (photos dans public/products/) et ne lisent plus le catalogue de la base. Quand les produits seront saisis dans le
// back-office avec leurs prix, passer SHOWCASE_ENABLED à false : le catalogue de la base reprend la main (panier, fiches, filtres).
//
// Les noms, types et contenances reprennent exactement ce qui est écrit sur les étiquettes des photos.
// Règle éditoriale : aucun prix, aucune promesse, rien d'inventé.

export const SHOWCASE_ENABLED: boolean = true;

export interface ShowcaseImage {
  src: string;
  alt: string;
}

export interface ShowcaseProduct {
  id: string;
  name: string;
  /** Type de soin, tel qu'écrit sur l'étiquette. */
  kind: string;
  /** Contenance, telle qu'écrite sur l'étiquette. */
  size: string;
  /** Première photo : produit seul. Deuxième photo (facultative) : produit ouvert ou en usage, visible au survol ou au toucher. */
  images: readonly [ShowcaseImage, ...ShowcaseImage[]];
}

export const SHOWCASE_PRODUCTS: readonly ShowcaseProduct[] = [
  {
    id: 'velvet',
    name: 'Velvet',
    kind: 'Masque capillaire nourrissant',
    size: '250 ml',
    images: [
      { src: '/products/velvet-1.webp', alt: 'Pot de Velvet, masque capillaire nourrissant Meëra Kinks, 250 ml.' },
      { src: '/products/velvet-2.webp', alt: 'Le pot de Velvet ouvert, sur le côté, avec sa crème couleur ivoire.' },
    ],
  },
  {
    id: 'slik',
    name: 'Slik',
    kind: 'Lait capillaire ultra hydratant',
    size: '250 ml',
    images: [{ src: '/products/slik-1.webp', alt: 'Flacon de Slik, lait capillaire ultra hydratant Meëra Kinks, 250 ml.' }],
  },
  {
    id: 'mousse-kinky',
    name: 'Mousse Kinky',
    kind: 'Shampoing ambunu & shikakai',
    size: '250 ml',
    images: [{ src: '/products/mousse-kinky-1.webp', alt: 'Flacon pompe de Mousse Kinky, shampoing ambunu et shikakai Meëra Kinks, 250 ml.' }],
  },
  {
    id: 'fluffy-kinks',
    name: 'Fluffy Kinks',
    kind: 'Chantilly capillaire',
    size: '120 g',
    images: [
      { src: '/products/fluffy-kinks-1.webp', alt: 'Pot de Fluffy Kinks, chantilly capillaire Meëra Kinks, 120 g.' },
      { src: '/products/fluffy-kinks-2.webp', alt: 'Le pot de Fluffy Kinks ouvert, avec sa chantilly blanche.' },
    ],
  },
  {
    id: 'elixir-wunter',
    name: 'Elixir Wunter',
    kind: 'Huile de croissance capillaire',
    size: '50 ml',
    images: [
      { src: '/products/elixir-wunter-1.webp', alt: 'Flacon compte-gouttes d’Elixir Wunter, huile de croissance capillaire Meëra Kinks, 50 ml.' },
      { src: '/products/elixir-wunter-2.webp', alt: 'Une goutte d’huile tombe de la pipette dans le flacon d’Elixir Wunter.' },
    ],
  },
  {
    id: 'brume',
    name: 'Brume',
    kind: 'Spray capillaire hydratant',
    size: '200 ml',
    images: [{ src: '/products/brume-1.webp', alt: 'Flacon spray de Brume, spray capillaire hydratant Meëra Kinks, 200 ml.' }],
  },
];

export const SHOWCASE = {
  /** Texte alternatif du bouton qui bascule entre les deux photos (le nom du soin est ajouté). */
  switchLabel: 'Voir l’autre photo de',
} as const;
