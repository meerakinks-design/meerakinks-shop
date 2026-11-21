import { FALLBACK_ACCENTS } from '@/lib/shop/sections';

// Couleurs des pots du mini-jeu « Cosmetic Smash » (D-19, P-42) : elles reprennent celles des CATÉGORIES de la boutique.
// Fichier pur (aucun accès au navigateur) : testé tel quel.

export interface PotPalette {
  /** Teinte (0–360). */
  h: number;
  /** Saturation (0–100), bornée pour que le pot reste lisible quelle que soit la couleur choisie. */
  s: number;
  /** Luminosité de base (0–100). */
  l: number;
}

export const MAX_PALETTES = 6;

export function parseHex(value: string | null | undefined): { r: number; g: number; b: number } | null {
  if (!value) return null;
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  let hex = match[1] ?? '';
  if (hex.length === 3) hex = [...hex].map((char) => char + char).join('');
  const number = Number.parseInt(hex, 16);
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
}

export function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l: lightness * 100 };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return { h: (hue * 60 + 360) % 360, s: saturation * 100, l: lightness * 100 };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Une couleur de catégorie → les réglages d'un pot (teinte conservée, saturation et luminosité bornées). */
export function paletteFromAccent(accent: string | null | undefined): PotPalette | null {
  const rgb = parseHex(accent);
  if (!rgb) return null;
  const { h, s, l } = rgbToHsl(rgb);
  return { h: Math.round(h), s: Math.round(clamp(s, 28, 82)), l: Math.round(clamp(l, 48, 74)) };
}

/**
 * Palettes du jeu : une par couleur de catégorie distincte (6 au plus). Sans couleur utilisable
 * (boutique sans catégorie, ou catégories sans couleur), on reprend les couleurs provisoires de la boutique.
 */
export function buildPalettes(accents: readonly (string | null | undefined)[]): PotPalette[] {
  const seen = new Set<string>();
  const palettes: PotPalette[] = [];
  for (const accent of accents) {
    const palette = paletteFromAccent(accent);
    if (!palette) continue;
    const key = `${palette.h}-${palette.s}-${palette.l}`;
    if (seen.has(key)) continue;
    seen.add(key);
    palettes.push(palette);
    if (palettes.length >= MAX_PALETTES) break;
  }
  if (palettes.length > 0) return palettes;
  return FALLBACK_ACCENTS.map((accent) => paletteFromAccent(accent)).filter((palette): palette is PotPalette => palette !== null);
}

/** Couleur CSS d'un pot : même teinte, luminosité décalée (`shift`, en points) et transparence facultative. */
export function tone(palette: PotPalette, shift = 0, alpha = 1, saturation?: number): string {
  const lightness = clamp(palette.l + shift, 3, 98);
  const sat = clamp(saturation ?? palette.s, 0, 100);
  return alpha >= 1 ? `hsl(${palette.h} ${sat}% ${lightness}%)` : `hsl(${palette.h} ${sat}% ${lightness}% / ${alpha})`;
}
