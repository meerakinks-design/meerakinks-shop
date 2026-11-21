import { describe, expect, it } from 'vitest';
import { MAX_PALETTES, buildPalettes, paletteFromAccent, parseHex, rgbToHsl, tone } from '@/lib/smash/palette';
import { FALLBACK_ACCENTS } from '@/lib/shop/sections';

describe('couleurs des pots (reprises des catégories)', () => {
  it('lit #rrggbb, #rgb et refuse le reste', () => {
    expect(parseHex('#f4a6c0')).toEqual({ r: 244, g: 166, b: 192 });
    expect(parseHex('#fc0')).toEqual({ r: 255, g: 204, b: 0 });
    expect(parseHex('rouge')).toBeNull();
    expect(parseHex('#12345')).toBeNull();
    expect(parseHex(null)).toBeNull();
  });

  it('convertit en teinte / saturation / luminosité', () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toMatchObject({ h: 0, s: 100, l: 50 });
    expect(Math.round(rgbToHsl({ r: 0, g: 0, b: 255 }).h)).toBe(240);
    expect(rgbToHsl({ r: 128, g: 128, b: 128 }).s).toBe(0);
  });

  it('garde la teinte de la catégorie et borne saturation et luminosité', () => {
    const pale = paletteFromAccent('#ffffff')!;
    const dark = paletteFromAccent('#000000')!;
    const vivid = paletteFromAccent('#ff00aa')!;
    expect(pale.l).toBeLessThanOrEqual(74);
    expect(dark.l).toBeGreaterThanOrEqual(48);
    expect(vivid.s).toBeLessThanOrEqual(82);
    expect(paletteFromAccent('#7a3f98')!.h).toBe(Math.round(rgbToHsl(parseHex('#7a3f98')!).h));
    expect(paletteFromAccent('pas une couleur')).toBeNull();
  });

  it('une palette par couleur distincte, six au plus', () => {
    const accents = ['#f4a6c0', '#f4a6c0', '#f2c94c', null, '#b69bd6', 'x', '#b7d36b', '#ff0000', '#00ff00', '#0000ff', '#00ffff'];
    const palettes = buildPalettes(accents);
    expect(palettes.length).toBe(MAX_PALETTES);
    expect(new Set(palettes.map((palette) => palette.h)).size).toBe(palettes.length);
  });

  it('sans couleur de catégorie utilisable : les couleurs provisoires de la boutique', () => {
    expect(buildPalettes([]).length).toBe(FALLBACK_ACCENTS.length);
    expect(buildPalettes([null, undefined, 'x']).length).toBe(FALLBACK_ACCENTS.length);
  });

  it('tone() produit une couleur CSS, avec ou sans transparence, bornée', () => {
    const palette = { h: 340, s: 60, l: 70 };
    expect(tone(palette)).toBe('hsl(340 60% 70%)');
    expect(tone(palette, -20)).toBe('hsl(340 60% 50%)');
    expect(tone(palette, 50)).toBe('hsl(340 60% 98%)');
    expect(tone(palette, 0, 0.5)).toBe('hsl(340 60% 70% / 0.5)');
    expect(tone(palette, 0, 1, 10)).toBe('hsl(340 10% 70%)');
  });
});
