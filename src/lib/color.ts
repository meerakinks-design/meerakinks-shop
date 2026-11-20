// Contraste des couleurs (WCAG 2.x) : le texte posé sur la couleur d'une catégorie reste lisible.

const HEX = /^#([0-9a-f]{6})$/i;
export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

function channelToLinear(channel: number): number {
  const scaled = channel / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const match = HEX.exec(hex);
  if (!match?.[1]) throw new Error(`Couleur invalide : ${hex}`);
  const value = parseInt(match[1], 16);
  const red = channelToLinear((value >> 16) & 255);
  const green = channelToLinear((value >> 8) & 255);
  const blue = channelToLinear(value & 255);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(firstHex: string, secondHex: string): number {
  const first = relativeLuminance(firstHex);
  const second = relativeLuminance(secondHex);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/**
 * Noir ou blanc, selon ce qui se lit le mieux sur la couleur de fond. Quel que soit le fond, le
 * meilleur des deux atteint au moins 4,58:1 (le pire cas est un gris de luminance ≈ 0,18) : le texte
 * respecte donc toujours le seuil WCAG AA de 4,5:1 pour du texte courant, sans réglage à la main.
 */
export function readableTextColor(backgroundHex: string): '#000000' | '#ffffff' {
  return contrastRatio(backgroundHex, '#000000') >= contrastRatio(backgroundHex, '#ffffff') ? '#000000' : '#ffffff';
}
