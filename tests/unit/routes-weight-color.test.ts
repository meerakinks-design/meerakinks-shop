import { describe, expect, it } from 'vitest';
import { contrastRatio, isHexColor, readableTextColor } from '@/lib/color';
import { MODAL_HASHES, PUBLIC_ROUTES, categoryPath, orderConfirmationPath, productPath } from '@/lib/constants/routes';
import { formatWeight, parseWeightToGrams, splitGrams } from '@/lib/weight';

describe('routes publiques', () => {
  it('suivent la structure validée', () => {
    expect(productPath('beurre-de-karite')).toBe('/produit/beurre-de-karite');
    expect(categoryPath('soins-capillaires')).toBe('/categorie/soins-capillaires');
    expect(PUBLIC_ROUTES.shop).toBe('/boutique');
    expect(PUBLIC_ROUTES.orderConfirmation).toBe('/commande/confirmation');
    expect(PUBLIC_ROUTES.about).toBe('/a-propos'); // « Notre histoire » : page dédiée
    expect(PUBLIC_ROUTES.credits).toBe('/credits');
  });
  it('menu, panier, commande et confirmation sont des modals à ancre ; « Notre histoire » n’en est plus un', () => {
    expect(MODAL_HASHES).toMatchObject({ menu: '#menu', cart: '#panier', checkout: '#commande', confirmation: '#confirmation' });
    expect(Object.values(MODAL_HASHES)).not.toContain('#notre-histoire');
  });
  it('n’ont pas de page pour le panier, la commande, le contact ni la FAQ', () => {
    const paths = Object.values(PUBLIC_ROUTES) as string[];
    for (const removed of ['/panier', '/commander', '/contact', '/faq', '/notre-histoire']) expect(paths).not.toContain(removed);
  });
  it('encode la référence dans l’adresse de confirmation', () => {
    expect(orderConfirmationPath('CMD-7K3M9QXP')).toBe('/commande/confirmation?ref=CMD-7K3M9QXP');
    expect(orderConfirmationPath('a b&c')).toBe('/commande/confirmation?ref=a%20b%26c');
  });
  it('les modals ont une ancre simple (lettres et tirets)', () => {
    for (const hash of Object.values(MODAL_HASHES)) expect(hash).toMatch(/^#[a-z-]+$/);
  });
});

describe('poids', () => {
  it('lit grammes et kilos, avec virgule ou point', () => {
    expect(parseWeightToGrams('250', 'g')).toBe(250);
    expect(parseWeightToGrams('1,5', 'kg')).toBe(1500);
    expect(parseWeightToGrams('1.25', 'kg')).toBe(1250);
    expect(parseWeightToGrams(' 2 ', 'kg')).toBe(2000);
  });
  it('refuse le vide, zéro, le texte et les grammes décimaux', () => {
    expect(parseWeightToGrams('', 'g')).toBeNull();
    expect(parseWeightToGrams('0', 'g')).toBeNull();
    expect(parseWeightToGrams('abc', 'kg')).toBeNull();
    expect(parseWeightToGrams('12,5', 'g')).toBeNull();
    expect(parseWeightToGrams('1,2345', 'kg')).toBeNull();
  });
  it('pré-remplit et affiche dans la bonne unité', () => {
    expect(splitGrams(250)).toEqual({ value: '250', unit: 'g' });
    expect(splitGrams(1500)).toEqual({ value: '1500', unit: 'g' });
    expect(splitGrams(2000)).toEqual({ value: '2', unit: 'kg' });
    expect(formatWeight(250)).toBe('250 g');
    expect(formatWeight(1500).replace(/\s/g, ' ')).toBe('1,5 kg');
  });
});

describe('couleur et lisibilité', () => {
  it('calcule le contraste noir / blanc (21:1)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });
  it('choisit un texte noir sur fond clair et blanc sur fond foncé', () => {
    expect(readableTextColor('#e8b800')).toBe('#000000'); // jaune
    expect(readableTextColor('#b4d230')).toBe('#000000'); // vert acide
    expect(readableTextColor('#7a3f98')).toBe('#ffffff'); // violet
    expect(readableTextColor('#111111')).toBe('#ffffff');
  });
  it('garantit un texte lisible (≥ 4,5:1) sur 4 096 fonds répartis dans tout l’espace de couleurs', () => {
    const hex = (value: number) => value.toString(16).padStart(2, '0');
    let worst = Infinity;
    for (let red = 0; red < 256; red += 17) {
      for (let green = 0; green < 256; green += 17) {
        for (let blue = 0; blue < 256; blue += 17) {
          const background = `#${hex(red)}${hex(green)}${hex(blue)}`;
          worst = Math.min(worst, contrastRatio(background, readableTextColor(background)));
        }
      }
    }
    expect(worst).toBeGreaterThanOrEqual(4.5);
  });
  it('reconnaît un format #RRGGBB', () => {
    expect(isHexColor('#a1B2c3')).toBe(true);
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor('rose')).toBe(false);
  });
});
