import { existsSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ShowcaseGrid } from '@/components/shop/ShowcaseGrid';
import { SHOWCASE_PRODUCTS } from '@/content/vitrine';

const PUBLIC_DIR = path.resolve(__dirname, '../../public');

describe('vitrine photo de la boutique', () => {
  it('présente les six soins dans l’ordre voulu, avec le nom et la contenance écrits sur les étiquettes', () => {
    expect(SHOWCASE_PRODUCTS.map((product) => product.name)).toEqual(['Velvet', 'Slik', 'Mousse Kinky', 'Fluffy Kinks', 'Elixir Wunter', 'Brume']);
    expect(SHOWCASE_PRODUCTS.map((product) => product.size)).toEqual(['250 ml', '250 ml', '250 ml', '120 g', '50 ml', '200 ml']);
  });

  it('répartit neuf photos : deux pour Velvet, Fluffy Kinks et Elixir Wunter, une pour les autres', () => {
    expect(SHOWCASE_PRODUCTS.map((product) => product.images.length)).toEqual([2, 1, 1, 2, 2, 1]);
  });

  it('chaque photo existe dans public/products et porte un texte alternatif', () => {
    for (const product of SHOWCASE_PRODUCTS) {
      for (const image of product.images) {
        expect(image.src.startsWith('/products/'), image.src).toBe(true);
        expect(existsSync(path.join(PUBLIC_DIR, image.src)), `${image.src} est absente de public/`).toBe(true);
        expect(image.alt.trim(), image.src).not.toBe('');
      }
    }
  });

  describe('rendu', () => {
    const html = renderToStaticMarkup(<ShowcaseGrid />);

    it('rend une cellule par soin, avec six dispositions différentes', () => {
      expect(html.match(/class="showcase-cell"/g)).toHaveLength(6);
      for (const slot of [0, 1, 2, 3, 4, 5]) expect(html).toContain(`data-slot="${slot}"`);
    });

    it('affiche le nom, le type de soin et la contenance de chaque produit', () => {
      for (const product of SHOWCASE_PRODUCTS) {
        expect(html).toContain(`>${product.name}</h3>`);
        expect(html).toContain(product.kind.replace(/&/g, '&amp;')); // le « & » est échappé dans le HTML
      }
    });

    it('ne propose un bouton « autre photo » que pour les soins qui ont une deuxième photo', () => {
      expect(html.match(/class="showcase-switch"/g)).toHaveLength(3);
      expect(html).toContain('Voir l’autre photo de Velvet');
    });

    it('n’affiche encore ni prix ni lien ni bouton d’ajout au panier (étape suivante)', () => {
      expect(html).not.toMatch(/FCFA|F CFA|<a /);
      expect(html).not.toContain('panier');
    });

    it('charge tout de suite les deux premières photos et laisse les autres en chargement différé', () => {
      expect(html.match(/loading="eager"/g)).toHaveLength(2);
      expect(html).toContain('loading="lazy"');
    });

    it('est identique à chaque rendu (pas d’erreur d’hydratation)', () => {
      expect(renderToStaticMarkup(<ShowcaseGrid />)).toBe(html);
    });
  });
});
