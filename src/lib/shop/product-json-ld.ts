// Données structurées « Product » d'une fiche produit (cahier §11, D-24) : une offre par variante quand le produit en a,
// une seule offre sinon. Fonction pure : testée sans page ni base.

const IN_STOCK = 'https://schema.org/InStock';
const OUT_OF_STOCK = 'https://schema.org/OutOfStock';

export interface ProductJsonLdVariant {
  name: string;
  /** FCFA, prix en vigueur de cette variante. */
  price: number;
  inStock: boolean;
  sku?: string | null;
}

export interface ProductJsonLdInput {
  name: string;
  description: string;
  sku: string | null;
  imageUrls: readonly string[];
  /** Adresse absolue de la fiche, ou null si l'adresse du site n'est pas configurée (on n'invente pas de domaine). */
  url: string | null;
  /** FCFA, prix en vigueur (promotion comprise). Sert quand il n'y a pas de variante. */
  price: number;
  inStock: boolean;
  variants?: readonly ProductJsonLdVariant[];
}

const availability = (inStock: boolean): string => (inStock ? IN_STOCK : OUT_OF_STOCK);

export function buildProductJsonLd(input: ProductJsonLdInput) {
  const variants = input.variants ?? [];
  const urlField = input.url ? { url: input.url } : {};

  const offers =
    variants.length > 0
      ? variants.map((variant) => ({
          '@type': 'Offer',
          name: variant.name,
          ...(variant.sku ? { sku: variant.sku } : {}),
          priceCurrency: 'XOF',
          price: variant.price,
          availability: availability(variant.inStock),
          ...urlField,
        }))
      : {
          '@type': 'Offer',
          priceCurrency: 'XOF',
          price: input.price,
          availability: availability(input.inStock),
          ...urlField,
        };

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    ...(input.sku ? { sku: input.sku } : {}),
    ...(input.imageUrls.length > 0 ? { image: [...input.imageUrls] } : {}),
    ...urlField,
    offers,
    // Pas de note moyenne ni d'avis : aucune donnée réelle (RM-40).
  };
}
