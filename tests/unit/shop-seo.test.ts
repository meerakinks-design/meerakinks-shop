import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from '@/lib/shop/json-ld';
import { hasShopFilters, parseShopParams, shopHref } from '@/lib/shop/search';
import { absoluteUrl, summarize } from '@/lib/shop/seo';

describe('serializeJsonLd', () => {
  it('empêche une description de fermer la balise <script>', () => {
    const output = serializeJsonLd({ description: 'Beurre </script><script>alert(1)</script>' });
    expect(output).not.toContain('</script>');
    expect(output).not.toContain('<');
    expect(JSON.parse(output).description).toBe('Beurre </script><script>alert(1)</script>');
  });
  it('échappe aussi les séparateurs de ligne Unicode', () => {
    expect(serializeJsonLd({ a: 'x\u2028y' })).not.toContain('\u2028');
  });
});

describe('summarize', () => {
  it('garde un texte court tel quel, espaces réduits', () => {
    expect(summarize('  Un   beurre\n doux. ')).toBe('Un beurre doux.');
  });
  it('coupe entre deux mots, avec des points de suspension, sans dépasser la limite', () => {
    const text = 'Un beurre de karité naturel pour la peau et les cheveux, riche et nourrissant. '.repeat(5);
    const result = summarize(text, 155);
    expect(result.length).toBeLessThanOrEqual(155);
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toMatch(/\s…$/);
  });
});

describe('absoluteUrl', () => {
  it('construit une adresse absolue depuis l’adresse du site', () => {
    expect(absoluteUrl('/produit/bonnet', 'https://boutique.ci')).toBe('https://boutique.ci/produit/bonnet');
    expect(absoluteUrl('/produit/bonnet', 'https://boutique.ci/')).toBe('https://boutique.ci/produit/bonnet');
  });
  it('n’invente pas de domaine quand il n’est pas configuré', () => {
    expect(absoluteUrl('/produit/bonnet', undefined)).toBeNull();
  });
});

describe('shopHref', () => {
  const base = parseShopParams({});
  it('omet les valeurs par défaut', () => {
    expect(shopHref(base)).toBe('/boutique');
  });
  it('compose les paramètres et garde les autres filtres', () => {
    const current = parseShopParams({ categorie: 'soins', q: 'karité' });
    expect(shopHref(current, { offers: true })).toBe('/boutique?categorie=soins&filtre=offres&q=kariti%C3%A9'.replace('kariti%C3%A9', 'karit%C3%A9'));
    expect(shopHref(current, { categorySlug: null })).toBe('/boutique?q=karit%C3%A9');
    expect(shopHref(current, { sort: 'prix-croissant' })).toContain('tri=prix-croissant');
  });
  it('les adresses des raccourcis du document de la landing existent', () => {
    expect(shopHref(base, { offers: true })).toBe('/boutique?filtre=offres');
    expect(shopHref(base, { sort: 'nouveautes' })).toBe('/boutique?tri=nouveautes');
    expect(hasShopFilters(parseShopParams({ filtre: 'offres' }))).toBe(true);
  });
});

describe('hasContactChannels', () => {
  const none = { whatsappLink: null, contactEmail: null, instagramUrl: null, tiktokUrl: null, facebookUrl: null };
  it('faux sans aucun moyen de contact, vrai dès qu’un seul existe', async () => {
    const { hasContactChannels } = await import('@/lib/shop/contact');
    expect(hasContactChannels(none)).toBe(false);
    expect(hasContactChannels({ ...none, contactEmail: 'bonjour@awa.ci' })).toBe(true);
    expect(hasContactChannels({ ...none, whatsappLink: 'https://wa.me/2250700000000' })).toBe(true);
    expect(hasContactChannels({ ...none, tiktokUrl: 'https://tiktok.com/@awa' })).toBe(true);
  });
});
