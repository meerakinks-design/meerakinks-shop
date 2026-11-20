import { describe, expect, it } from 'vitest';
import { SLUG_MAX_LENGTH, SLUG_PATTERN, findFreeSlug, slugify } from '@/lib/slug';

describe('slugify', () => {
  it('retire les accents, la ponctuation et les apostrophes', () => {
    expect(slugify('Bonnet double face — l’Été !')).toBe('bonnet-double-face-lete');
  });
  it('gère les ligatures françaises', () => {
    expect(slugify('Cœur d’œuf')).toBe('coeur-doeuf');
  });
  it('réduit les séparateurs répétés et retire ceux des extrémités', () => {
    expect(slugify('  --Pack   Week-end--  ')).toBe('pack-week-end');
  });
  it('rend une chaîne vide quand il ne reste rien d’exploitable', () => {
    expect(slugify('!!! ???')).toBe('');
  });
  it('limite la longueur sans finir par un tiret', () => {
    const slug = slugify('mot '.repeat(60));
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(slug.endsWith('-')).toBe(false);
  });
  it('produit toujours un slug valide', () => {
    for (const name of ['Sérum visage 30 ml', 'Ensemble 2 pièces (S/M)', 'Offre promotionnelle Week-end']) {
      expect(slugify(name)).toMatch(SLUG_PATTERN);
    }
  });
});

describe('findFreeSlug', () => {
  it('garde la base quand elle est libre', async () => {
    expect(await findFreeSlug('bonnet', 'produit', async () => false)).toBe('bonnet');
  });
  it('ajoute un suffixe tant que le slug est pris', async () => {
    const taken = new Set(['bonnet', 'bonnet-2']);
    expect(await findFreeSlug('bonnet', 'produit', async (slug) => taken.has(slug))).toBe('bonnet-3');
  });
  it('utilise le repli quand le nom ne donne aucun slug', async () => {
    expect(await findFreeSlug('', 'produit', async () => false)).toBe('produit');
  });
});
