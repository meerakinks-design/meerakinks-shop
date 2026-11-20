import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cartQuoteSchema } from '@/lib/validation/cart.schema';
import { computeSubtotal, computeTotal, lineTotal } from '@/server/services/pricing';

const db = { product: { findMany: vi.fn() } };
vi.mock('@/server/db', () => ({ prisma: db }));
const { quoteCart } = await import('@/server/services/quote.service');

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1', slug: 'bonnet', name: 'Bonnet', price: 5000, salePrice: null, stock: null, status: 'PUBLISHED',
  images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1/boutique/products/a.jpg', alt: 'Bonnet' }], ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe('pricing', () => {
  it('calcule lignes et sous-total en entiers', () => {
    expect(lineTotal({ unitPrice: 2500, quantity: 3 })).toBe(7500);
    expect(computeSubtotal([{ unitPrice: 2500, quantity: 3 }, { unitPrice: 1000, quantity: 1 }])).toBe(8500);
    expect(computeSubtotal([])).toBe(0);
  });
  it('ne produit jamais un total quand les frais sont inconnus (RM-03)', () => {
    expect(computeTotal(8500, null)).toBeNull();
    expect(computeTotal(8500, 1500)).toBe(10000);
    expect(computeTotal(8500, 0)).toBe(8500);
  });
});

describe('quoteCart', () => {
  it('relit les prix en base et calcule le sous-total officiel', async () => {
    db.product.findMany.mockResolvedValue([row(), row({ id: 'p2', slug: 'serum', name: 'Sérum', price: 12000, salePrice: 9000 })]);
    const quote = await quoteCart([{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }]);
    expect(quote.subtotal).toBe(19000);
    expect(quote.lines[1]).toMatchObject({ unitPrice: 9000, regularPrice: 12000, lineTotal: 9000, status: 'ok' });
    expect(quote.lines[0]).toMatchObject({ unitPrice: 5000, regularPrice: null, imageUrl: expect.stringContaining('cloudinary') });
  });

  it('fusionne les lignes en double et plafonne à 20', async () => {
    db.product.findMany.mockResolvedValue([row()]);
    const quote = await quoteCart([{ productId: 'p1', quantity: 15 }, { productId: 'p1', quantity: 15 }]);
    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0]!.quantity).toBe(20);
    expect(db.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['p1'] } } }));
  });

  it('exclut un produit inconnu, brouillon ou archivé, sans casser le reste', async () => {
    db.product.findMany.mockResolvedValue([row(), row({ id: 'p3', status: 'DRAFT' })]);
    const quote = await quoteCart([{ productId: 'p1', quantity: 1 }, { productId: 'p3', quantity: 1 }, { productId: 'fantome', quantity: 4 }]);
    expect(quote.subtotal).toBe(5000);
    expect(quote.lines.map((line) => line.status)).toEqual(['ok', 'unavailable', 'unavailable']);
    expect(quote.lines[1]).toMatchObject({ quantity: 0, lineTotal: 0, name: 'Produit indisponible' });
  });

  it('signale un produit épuisé et plafonne la quantité au stock', async () => {
    db.product.findMany.mockResolvedValue([row({ stock: 0 }), row({ id: 'p2', stock: 2 })]);
    const quote = await quoteCart([{ productId: 'p1', quantity: 3 }, { productId: 'p2', quantity: 5 }]);
    expect(quote.lines[0]).toMatchObject({ status: 'out_of_stock', quantity: 0, lineTotal: 0 });
    expect(quote.lines[1]).toMatchObject({ status: 'limited', requestedQuantity: 5, quantity: 2, maxQuantity: 2, lineTotal: 10000 });
    expect(quote.subtotal).toBe(10000);
  });

  it('un panier vide ne touche pas la base', async () => {
    expect(await quoteCart([])).toEqual({ lines: [], subtotal: 0 });
    expect(db.product.findMany).not.toHaveBeenCalled();
  });
});

describe('cartQuoteSchema', () => {
  it('borne les lignes et les quantités', () => {
    expect(cartQuoteSchema.safeParse({ items: [{ productId: 'p1', quantity: 2 }] }).success).toBe(true);
    expect(cartQuoteSchema.safeParse({ items: [{ productId: 'p1', quantity: 0 }] }).success).toBe(false);
    expect(cartQuoteSchema.safeParse({ items: [{ productId: 'p1', quantity: 21 }] }).success).toBe(false);
    expect(cartQuoteSchema.safeParse({ items: [{ productId: 'p1', quantity: 1.5 }] }).success).toBe(false);
    expect(cartQuoteSchema.safeParse({ items: Array.from({ length: 31 }, (_, i) => ({ productId: `p${i}`, quantity: 1 })) }).success).toBe(false);
    expect(cartQuoteSchema.safeParse({}).success).toBe(false);
  });
});
