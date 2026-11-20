import { describe, expect, it } from 'vitest';
import { discountPercent, effectivePrice, hasPromotion, isNewProduct, isOutOfStock, maxOrderableQuantity } from '@/lib/shop/product-display';
import { fill } from '@/lib/shop/template';
import { hasShopFilters, parseShopParams } from '@/lib/shop/search';
import { toWhatsappDigits, whatsappLink } from '@/lib/shop/whatsapp';

describe('prix affiché', () => {
  it('facture le prix promotionnel quand il existe et reste inférieur', () => {
    expect(effectivePrice({ price: 5000, salePrice: 4000 })).toBe(4000);
    expect(hasPromotion({ price: 5000, salePrice: 4000 })).toBe(true);
    expect(discountPercent({ price: 5000, salePrice: 4000 })).toBe(20);
  });
  it('ignore une promotion incohérente (égale ou supérieure au prix)', () => {
    expect(effectivePrice({ price: 5000, salePrice: 5000 })).toBe(5000);
    expect(effectivePrice({ price: 5000, salePrice: 6000 })).toBe(5000);
    expect(effectivePrice({ price: 5000, salePrice: null })).toBe(5000);
    expect(discountPercent({ price: 5000, salePrice: null })).toBeNull();
  });
});

describe('badge « Nouveau »', () => {
  const now = new Date('2026-11-14T12:00:00Z');
  it('vaut 30 jours ou moins après la première publication', () => {
    expect(isNewProduct('2026-11-10T00:00:00Z', now)).toBe(true);
    expect(isNewProduct('2026-10-16T12:00:00Z', now)).toBe(true); // exactement 29 jours
    expect(isNewProduct('2026-10-14T12:00:00Z', now)).toBe(false); // 31 jours
  });
  it('est faux sans date de publication ou avec une date future', () => {
    expect(isNewProduct(null, now)).toBe(false);
    expect(isNewProduct('2026-12-01T00:00:00Z', now)).toBe(false);
  });
});

describe('stock', () => {
  it('null = non suivi : jamais épuisé ; 0 = épuisé', () => {
    expect(isOutOfStock(null)).toBe(false);
    expect(isOutOfStock(0)).toBe(true);
    expect(isOutOfStock(3)).toBe(false);
  });
  it('plafonne la quantité par le stock et par 20', () => {
    expect(maxOrderableQuantity(null)).toBe(20);
    expect(maxOrderableQuantity(3)).toBe(3);
    expect(maxOrderableQuantity(500)).toBe(20);
    expect(maxOrderableQuantity(0)).toBe(0);
  });
});

describe('fill', () => {
  it('remplace les variables', () => {
    expect(fill('Bienvenue chez {storeName} !', { storeName: 'Awa Beauty' })).toBe('Bienvenue chez Awa Beauty !');
  });
  it('refuse une variable inconnue plutôt que de publier « {storeName} »', () => {
    expect(() => fill('Bonjour {nom}', {})).toThrow('{nom}');
  });
});

describe('paramètres de /boutique', () => {
  it('lit les paramètres valides', () => {
    expect(parseShopParams({ categorie: 'soins-capillaires', filtre: 'offres', tri: 'nouveautes', q: ' beurre   de karité ' })).toEqual({
      categorySlug: 'soins-capillaires',
      offers: true,
      sort: 'nouveautes',
      query: 'beurre de karité',
    });
  });
  it('nettoie tout le reste (valeurs inconnues, tableaux, injection)', () => {
    const params = parseShopParams({ categorie: "x'; DROP TABLE", filtre: 'autre', tri: 'hasard', q: 'a'.repeat(200) });
    expect(params.categorySlug).toBeNull();
    expect(params.offers).toBe(false);
    expect(params.sort).toBe('defaut');
    expect(params.query).toHaveLength(80);
    expect(parseShopParams({ tri: ['prix-croissant', 'x'] }).sort).toBe('prix-croissant');
  });
  it('sait si la page est filtrée (adresse canonique)', () => {
    expect(hasShopFilters(parseShopParams({}))).toBe(false);
    expect(hasShopFilters(parseShopParams({ q: 'karité' }))).toBe(true);
  });
});

describe('lien WhatsApp', () => {
  it('ne garde que les chiffres, entre 8 et 15', () => {
    expect(toWhatsappDigits('+225 07 00 00 00 00')).toBe('2250700000000');
    expect(toWhatsappDigits('À configurer')).toBeNull();
    expect(toWhatsappDigits('1234')).toBeNull();
    expect(toWhatsappDigits(null)).toBeNull();
  });
  it('construit un lien avec message encodé, et aucun lien pour un numéro provisoire', () => {
    expect(whatsappLink('+2250700000000', 'Bonjour, j’ai une question.')).toBe('https://wa.me/2250700000000?text=Bonjour%2C%20j%E2%80%99ai%20une%20question.');
    expect(whatsappLink('À configurer')).toBeNull();
  });
});
