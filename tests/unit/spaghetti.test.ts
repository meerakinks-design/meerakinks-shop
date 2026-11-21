import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { elasticLinear, elasticOut, planSpaghetti, SPAGHETTI, spaghettiStepMs, splitChars, splitWords } from '@/lib/shop/spaghetti';

const CSS = readFileSync(path.resolve(__dirname, '../../src/styles/spaghetti.css'), 'utf-8');

describe('effet « spaghetti » — valeurs de Rabbit Shop (D-29)', () => {
  it('reprend les réglages du code de Rabbit : elastic.out(0.75, 0.3), 0,015 s entre deux lettres', () => {
    expect(SPAGHETTI.amplitude).toBe(0.75);
    expect(SPAGHETTI.period).toBe(0.3);
    expect(SPAGHETTI.charStepMs).toBe(15);
  });

  it('le CSS reprend le départ (60 px, échelle 0,5, transparent), la durée de 1,3 s et le décalage de 15 ms', () => {
    expect(CSS).toMatch(/--sp-y:\s*60px/);
    expect(CSS).toMatch(/--sp-s:\s*0\.5;/);
    expect(CSS).toMatch(/--sp-dur:\s*1300ms/);
    expect(CSS).toMatch(/--sp-step:\s*15ms/);
    expect(CSS).toMatch(/from\s*{\s*opacity:\s*0;\s*transform:\s*translateY\(var\(--sp-y\)\)\s*scale\(var\(--sp-s\)\)/);
    expect(CSS).toMatch(/to\s*{\s*opacity:\s*1;\s*transform:\s*translateY\(0\)\s*scale\(1\)/);
  });
});

describe('courbe élastique', () => {
  it('part de 0, finit à 1, passe par 1 à p = 0,1 puis rebondit au-dessus de 1', () => {
    expect(elasticOut(0)).toBe(0);
    expect(elasticOut(1)).toBe(1);
    expect(elasticOut(0.1)).toBeCloseTo(1, 6);
    expect(elasticOut(0.05)).toBeCloseTo(0.5, 6); // 2^(−0,5) · sin(−π/4) + 1
    const peak = Math.max(...Array.from({ length: 1001 }, (_, index) => elasticOut(index / 1000)));
    expect(peak).toBeGreaterThan(1.2);
    expect(peak).toBeLessThan(1.3);
  });

  it('retombe sous 1 (rebond) puis se stabilise', () => {
    expect(elasticOut(0.4)).toBeLessThan(1);
    for (const progress of [0.7, 0.8, 0.9, 0.99]) expect(Math.abs(elasticOut(progress) - 1)).toBeLessThan(0.01);
  });

  it('ne dépend pas de l’amplitude au-delà de 1 comme le fait GSAP (amplitude ≥ 1 : p1 = amplitude)', () => {
    expect(elasticOut(0, 1, 0.3)).toBe(0);
    expect(elasticOut(0.05, 1.5, 0.3)).toBeGreaterThan(0);
  });

  it('la courbe CSS linear() a 64 points, commence à 0 et finit à 1', () => {
    const curve = elasticLinear();
    expect(curve.startsWith('linear(0, ')).toBe(true);
    expect(curve.endsWith(', 1)')).toBe(true);
    expect(curve.slice(7, -1).split(', ')).toHaveLength(SPAGHETTI.stops);
  });

  it('le fichier CSS contient EXACTEMENT la courbe calculée : elle ne peut pas dériver', () => {
    expect(CSS).toContain(`--sp-ease: ${elasticLinear()};`);
  });
});

describe('accessibilité et mouvement réduit (CSS)', () => {
  it('le mouvement réduit supprime l’animation et l’état masqué', () => {
    const block = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/animation:\s*none\s*!important/);
    expect(block).toMatch(/opacity:\s*1\s*!important/);
    expect(block).toMatch(/transform:\s*none\s*!important/);
  });
  it('l’impression affiche le texte tel quel', () => {
    expect(CSS).toContain('@media print');
  });
  it('un mot n’est jamais coupé : mot insécable, retour à la ligne entre les mots', () => {
    expect(CSS).toMatch(/\.sp-w\s*{\s*white-space:\s*nowrap/);
    expect(CSS).toMatch(/\.sp-u\s*{\s*display:\s*inline-block/);
  });
  it('rien n’est masqué tant que le composant n’a pas posé data-sp (texte visible sans JavaScript)', () => {
    const hidden = [...CSS.matchAll(/([^{}]+)\{\s*opacity:\s*0;/g)].map((match) => (match[1] ?? '').trim());
    // `from` est l'image de départ de l'animation : elle ne s'applique qu'une fois data-sp posé sur « in ».
    expect(hidden.filter((selector) => selector !== 'from' && !selector.includes("[data-sp='hidden']"))).toEqual([]);
  });
  it('l’effet est allégé sur téléphone', () => {
    expect(CSS).toMatch(/@media \(max-width: 640px\)\s*{\s*\.sp\s*{\s*--sp-k:\s*0\.75/);
  });
});

describe('découpe du texte', () => {
  it('sépare les mots, ignore les espaces en trop et compose les accents (NFC)', () => {
    expect(splitWords('  Et si   prendre\nsoin ?  ')).toEqual(['Et', 'si', 'prendre', 'soin', '?']);
    expect(splitWords('re\u0301seau')).toEqual(['réseau']);
    expect(splitWords('')).toEqual([]);
  });
  it('découpe en lettres sans casser un emoji', () => {
    expect(splitChars('rituel')).toHaveLength(6);
    expect(splitChars('a💄b')).toEqual(['a', '💄', 'b']);
  });
  it('mode « chars » : les lettres sont numérotées dans l’ordre, tous mots confondus', () => {
    const plan = planSpaghetti('Vos essentiels', 'chars');
    expect(plan.count).toBe(13);
    expect(plan.words.map((word) => word.text)).toEqual(['Vos', 'essentiels']);
    expect(plan.words.flatMap((word) => word.chars ?? []).map((unit) => unit.index)).toEqual(Array.from({ length: 13 }, (_, index) => index));
    expect(plan.stepMs).toBe(15);
  });
  it('mode « words » : un rang par mot', () => {
    const plan = planSpaghetti('Découvrez une sélection', 'words');
    expect(plan.count).toBe(3);
    expect(plan.words.map((word) => word.index)).toEqual([0, 1, 2]);
    expect(plan.stepMs).toBe(20);
  });
  it('un long texte garde un étalement borné : le décalage diminue', () => {
    const longTitle = 'a'.repeat(200);
    const step = spaghettiStepMs('chars', 200);
    expect(step * 199).toBeLessThanOrEqual(SPAGHETTI.maxSpreadMs.chars + 0.5);
    expect(step).toBeLessThan(SPAGHETTI.charStepMs);
    expect(planSpaghetti(longTitle, 'chars').stepMs).toBe(step);
    const words = Array.from({ length: 80 }, () => 'mot').join(' ');
    expect(planSpaghetti(words, 'words').stepMs * 79).toBeLessThanOrEqual(SPAGHETTI.maxSpreadMs.words + 0.5);
  });
  it('un titre ordinaire garde exactement le décalage de Rabbit (15 ms)', () => {
    expect(spaghettiStepMs('chars', 1)).toBe(15);
    expect(spaghettiStepMs('chars', 60)).toBe(15);
  });
});
