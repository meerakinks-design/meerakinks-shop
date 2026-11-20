import { describe, expect, it } from 'vitest';
import { productInputSchema } from '@/lib/validation/product.schema';

const image = (id: string) => ({ url: `https://res.cloudinary.com/demo/image/upload/v1/boutique/products/${id}.jpg`, publicId: `boutique/products/${id}`, alt: `Photo ${id}` });
const valid = {
  name: 'Bonnet double face',
  description: 'Un bonnet doux.',
  characteristics: ['Satin', 'Taille unique'],
  price: 5000,
  stock: null,
  status: 'DRAFT',
  images: [],
};

function fieldsOf(input: unknown) {
  const result = productInputSchema.safeParse(input);
  return result.success ? null : result.error.flatten().fieldErrors;
}

describe('productInputSchema', () => {
  it('accepte un brouillon minimal et normalise les champs facultatifs', () => {
    const parsed = productInputSchema.parse({ ...valid, usageAdvice: '   ', categoryId: undefined });
    expect(parsed.usageAdvice).toBeNull();
    expect(parsed.categoryId).toBeNull();
    expect(parsed.sortOrder).toBe(0);
    expect(parsed.slug).toBeUndefined();
  });

  it('refuse un prix absent, nul, décimal ou négatif, avec un message clair', () => {
    expect(fieldsOf({ ...valid, price: undefined })?.price?.[0]).toBe('Indique un prix en FCFA.');
    expect(fieldsOf({ ...valid, price: null })?.price?.[0]).toBe('Indique un prix en FCFA.');
    expect(fieldsOf({ ...valid, price: 0 })?.price?.[0]).toBe('Le prix doit être supérieur à 0.');
    expect(fieldsOf({ ...valid, price: 12.5 })?.price?.[0]).toBe('Le prix doit être un nombre entier.');
    expect(fieldsOf({ ...valid, price: -5 })?.price).toBeDefined();
  });

  it('accepte stock null (non suivi) ou 0, refuse un stock négatif ou décimal', () => {
    expect(productInputSchema.safeParse({ ...valid, stock: null }).success).toBe(true);
    expect(productInputSchema.safeParse({ ...valid, stock: 0 }).success).toBe(true);
    expect(fieldsOf({ ...valid, stock: -1 })?.stock).toBeDefined();
    expect(fieldsOf({ ...valid, stock: 1.5 })?.stock).toBeDefined();
  });

  it('exige au moins une photo pour publier', () => {
    expect(fieldsOf({ ...valid, status: 'PUBLISHED' })?.images?.[0]).toBe('Ajoute au moins une photo avant de publier.');
    expect(productInputSchema.safeParse({ ...valid, status: 'PUBLISHED', images: [image('a')] }).success).toBe(true);
  });

  it('refuse la même photo deux fois et plus de 8 photos', () => {
    expect(fieldsOf({ ...valid, images: [image('a'), image('a')] })?.images?.[0]).toBe('La même photo est présente deux fois.');
    const nine = Array.from({ length: 9 }, (_, index) => image(`p${index}`));
    expect(fieldsOf({ ...valid, images: nine })?.images).toBeDefined();
  });

  it('exige une description pour chaque photo', () => {
    expect(fieldsOf({ ...valid, images: [{ ...image('a'), alt: ' ' }] })?.images).toBeDefined();
  });

  it('autorise un brouillon ou un produit archivé sans photo', () => {
    expect(productInputSchema.safeParse({ ...valid, status: 'ARCHIVED' }).success).toBe(true);
  });

  it('refuse un statut inconnu', () => {
    expect(fieldsOf({ ...valid, status: 'EN_LIGNE' })?.status).toBeDefined();
  });

  it('exige un prix promotionnel strictement inférieur au prix normal', () => {
    expect(productInputSchema.parse({ ...valid, salePrice: 4000 }).salePrice).toBe(4000);
    expect(fieldsOf({ ...valid, salePrice: 5000 })?.salePrice?.[0]).toBe('Le prix promotionnel doit être inférieur au prix normal.');
    expect(fieldsOf({ ...valid, salePrice: 6000 })?.salePrice).toBeDefined();
    expect(productInputSchema.parse({ ...valid, salePrice: null }).salePrice).toBeNull();
    expect(productInputSchema.parse(valid).salePrice).toBeNull();
  });

  it('accepte un poids en grammes entier positif, refuse 0 ou décimal', () => {
    expect(productInputSchema.parse({ ...valid, weightGrams: 250 }).weightGrams).toBe(250);
    expect(fieldsOf({ ...valid, weightGrams: 0 })?.weightGrams).toBeDefined();
    expect(fieldsOf({ ...valid, weightGrams: 12.5 })?.weightGrams).toBeDefined();
  });

  it('normalise la référence interne (vide → null) et refuse les caractères inattendus', () => {
    expect(productInputSchema.parse({ ...valid, sku: '  ' }).sku).toBeNull();
    expect(productInputSchema.parse({ ...valid, sku: 'BK-001' }).sku).toBe('BK-001');
    expect(fieldsOf({ ...valid, sku: 'réf 1' })?.sku).toBeDefined();
    expect(fieldsOf({ ...valid, sku: 'x'.repeat(41) })?.sku).toBeDefined();
  });

  it('limite le titre SEO à 70 caractères et la méta-description à 160', () => {
    expect(fieldsOf({ ...valid, seoTitle: 'x'.repeat(71) })?.seoTitle).toBeDefined();
    expect(fieldsOf({ ...valid, metaDescription: 'x'.repeat(161) })?.metaDescription).toBeDefined();
    expect(productInputSchema.parse({ ...valid, seoTitle: '  ', metaDescription: '' }).seoTitle).toBeNull();
  });

  it('refuse un lien (slug) mal formé', () => {
    expect(fieldsOf({ ...valid, slug: 'Mon Lien!' })?.slug).toBeDefined();
    expect(productInputSchema.safeParse({ ...valid, slug: 'mon-lien' }).success).toBe(true);
  });

  it('refuse une caractéristique vide ou plus de 20 caractéristiques', () => {
    expect(fieldsOf({ ...valid, characteristics: ['ok', ''] })?.characteristics).toBeDefined();
    expect(fieldsOf({ ...valid, characteristics: Array.from({ length: 21 }, (_, index) => `c${index}`) })?.characteristics).toBeDefined();
  });
});
