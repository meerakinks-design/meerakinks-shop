import { z } from 'zod';
import { MAX_PRODUCT_IMAGES } from '@/lib/constants/images';
import { PRODUCT_STATUSES } from '@/lib/constants/product';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '@/lib/slug';

export const slugSchema = z
  .string()
  .trim()
  .min(2, 'Le lien doit contenir au moins 2 caractères.')
  .max(SLUG_MAX_LENGTH)
  .regex(SLUG_PATTERN, 'Le lien ne peut contenir que des lettres minuscules, des chiffres et des tirets.');

export const productImageSchema = z.object({
  url: z.string().url().max(500),
  publicId: z.string().min(1).max(200),
  alt: z.string().trim().min(2, 'Décris chaque photo en quelques mots.').max(125, 'Description trop longue (125 caractères maximum).'),
});

const emptyToNull = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

const optionalInteger = (field: string, min: number, max: number) =>
  z
    .number({ invalid_type_error: `Indique ${field} en chiffres.` })
    .int(`${field[0]?.toUpperCase() ?? ''}${field.slice(1)} doit être un nombre entier.`)
    .min(min)
    .max(max)
    .nullish()
    .transform((value) => value ?? null);

// Référence interne : lettres, chiffres, point, tiret, souligné.
const skuField = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z
    .string()
    .trim()
    .max(40, 'La référence est trop longue (40 caractères maximum).')
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'Lettres, chiffres, point, tiret ou souligné uniquement.')
    .nullish()
    .transform((value) => value ?? null),
);

export const productInputSchema = z
  .object({
    name: z.string({ required_error: 'Donne un nom au produit.' }).trim().min(2, 'Le nom est trop court.').max(120, 'Le nom est trop long.'),
    slug: slugSchema.optional(),
    categoryId: z
      .string()
      .min(1)
      .nullish()
      .transform((value) => value ?? null),
    description: z.string({ required_error: 'Ajoute une description.' }).trim().min(1, 'Ajoute une description.').max(5000),
    characteristics: z.array(z.string().trim().min(1).max(200)).max(20, '20 caractéristiques maximum.'),
    usageAdvice: emptyToNull(3000),
    price: z
      .number({ required_error: 'Indique un prix en FCFA.', invalid_type_error: 'Indique un prix en FCFA.' })
      .int('Le prix doit être un nombre entier.')
      .min(1, 'Le prix doit être supérieur à 0.')
      .max(100_000_000, 'Prix trop élevé.'),
    // null = stock non suivi (le produit n'est jamais « épuisé »)
    stock: z
      .number({ invalid_type_error: 'Indique une quantité.' })
      .int('La quantité doit être un nombre entier.')
      .min(0, 'La quantité ne peut pas être négative.')
      .max(100_000)
      .nullable(),
    // Prix promotionnel facultatif : le client paie `salePrice ?? price`.
    salePrice: optionalInteger('le prix promotionnel', 1, 100_000_000),
    // Poids en grammes (l'interface convertit depuis g ou kg).
    weightGrams: optionalInteger('le poids', 1, 1_000_000),
    sku: skuField,
    status: z.enum(PRODUCT_STATUSES, { required_error: 'Choisis un statut.' }),
    isFeatured: z.boolean().default(false),
    seoTitle: emptyToNull(70),
    metaDescription: emptyToNull(160),
    sortOrder: z.number().int().min(0).max(10_000).default(0),
    images: z.array(productImageSchema).max(MAX_PRODUCT_IMAGES, `${MAX_PRODUCT_IMAGES} photos maximum.`),
  })
  .superRefine((value, context) => {
    if (value.salePrice !== null && value.salePrice >= value.price) {
      context.addIssue({ code: 'custom', path: ['salePrice'], message: 'Le prix promotionnel doit être inférieur au prix normal.' });
    }
    if (value.status === 'PUBLISHED' && value.images.length === 0) {
      context.addIssue({ code: 'custom', path: ['images'], message: 'Ajoute au moins une photo avant de publier.' });
    }
    const publicIds = value.images.map((image) => image.publicId);
    if (new Set(publicIds).size !== publicIds.length) {
      context.addIssue({ code: 'custom', path: ['images'], message: 'La même photo est présente deux fois.' });
    }
  });

/** Ce que le navigateur envoie. */
export type ProductFormInput = z.input<typeof productInputSchema>;
/** Ce que le serveur manipule, après validation et normalisation. */
export type ProductData = z.output<typeof productInputSchema>;
export type ProductImageInput = z.infer<typeof productImageSchema>;
