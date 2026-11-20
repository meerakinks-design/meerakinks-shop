import { z } from 'zod';
import { slugSchema } from '@/lib/validation/product.schema';

export const categoryInputSchema = z.object({
  name: z.string({ required_error: 'Donne un nom à la catégorie.' }).trim().min(2, 'Le nom est trop court.').max(60, 'Le nom est trop long.'),
  slug: slugSchema.optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description trop longue (500 caractères maximum).')
    .nullish()
    .transform((value) => (value ? value : null)),
  accentColor: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide (format #RRGGBB).')
      .nullish()
      .transform((value) => (value ? value.toLowerCase() : null)),
  ),
  // Archivée : masquée du site, conservée.
  isArchived: z.boolean().default(false),
  position: z.number().int().min(0).max(1000).default(0),
});

export type CategoryFormInput = z.input<typeof categoryInputSchema>;
export type CategoryData = z.output<typeof categoryInputSchema>;
