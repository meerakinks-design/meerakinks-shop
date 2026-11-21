import type { PotKind } from './engine';
import { tone, type PotPalette } from './palette';

// Dessin des pots du mini-jeu (D-19, P-42) : des contenants cosmétiques GÉNÉRIQUES, sans marque ni nom de produit.
// Rien d'une icône : chaque matière est construite avec des dégradés. Verre (reflets longs, bords sombres, lumière
// rebondie), plastique (brillant doux), métal (bandes très contrastées, moletage). Lumière unique, en haut à gauche.
// Ce fichier ne touche à aucune API du navigateur en dehors du contexte 2D qu'on lui passe : il se teste avec un faux contexte.

export type Ctx = CanvasRenderingContext2D;

/** Boîte de dessin : 100 × 120 unités, centrée sur (0, 0). Les pots y tiennent tous. */
export const DESIGN = { width: 100, height: 120, visualHeight: 108 } as const;

/** Verre pour le pot de crème, le compte-gouttes et la bouteille ; plastique pour le flacon pompe et le tube. */
export const POT_MATERIAL: Record<PotKind, 'glass' | 'plastic'> = { jar: 'glass', pump: 'plastic', dropper: 'glass', tube: 'plastic', bottle: 'glass' };

const TAU = Math.PI * 2;
type Stops = ReadonlyArray<readonly [number, string]>;

interface Metal {
  h: number;
  s: number;
}
/** Or, argent, or rose : choisi selon la couleur du pot, pour varier les bouchons. */
const METALS: readonly Metal[] = [
  { h: 43, s: 62 },
  { h: 214, s: 7 },
  { h: 17, s: 42 },
];
const metalAt = (paletteIndex: number): Metal => METALS[paletteIndex % METALS.length] ?? METALS[0]!;
const metal = (m: Metal, lightness: number, alpha = 1) => (alpha >= 1 ? `hsl(${m.h} ${m.s}% ${lightness}%)` : `hsl(${m.h} ${m.s}% ${lightness}% / ${alpha})`);

const linear = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: Stops): CanvasGradient => {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
};
const radial = (ctx: Ctx, x: number, y: number, r0: number, r1: number, stops: Stops, scaleY = 1): CanvasGradient => {
  void scaleY;
  const gradient = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
};

/** Cylindre éclairé d'en haut à gauche : bord sombre, bande claire, lumière rebondie sur le bord ombré. */
const cylinderStops = (p: PotPalette, lift = 0, saturation?: number): Stops => [
  [0, tone(p, -26 + lift, 1, saturation)],
  [0.06, tone(p, -14 + lift, 1, saturation)],
  [0.2, tone(p, 13 + lift, 1, saturation)],
  [0.36, tone(p, 7 + lift, 1, saturation)],
  [0.6, tone(p, -5 + lift, 1, saturation)],
  [0.82, tone(p, -17 + lift, 1, saturation)],
  [0.92, tone(p, -9 + lift, 1, saturation)],
  [1, tone(p, -31 + lift, 1, saturation)],
];

const metalStops = (m: Metal): Stops => [
  [0, metal(m, 22)],
  [0.07, metal(m, 52)],
  [0.18, metal(m, 92)],
  [0.3, metal(m, 62)],
  [0.48, metal(m, 80)],
  [0.64, metal(m, 42)],
  [0.8, metal(m, 68)],
  [0.92, metal(m, 33)],
  [1, metal(m, 19)],
];

/** Chemin d'un rectangle à coins arrondis (rayons : haut-gauche, haut-droit, bas-droit, bas-gauche). */
const roundRect = (ctx: Ctx, x: number, y: number, w: number, h: number, radii: number | readonly [number, number, number, number]) => {
  const [tl, tr, br, bl] = typeof radii === 'number' ? [radii, radii, radii, radii] : radii;
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
};

/** Reflet vertical : un long trait de lumière qui s'efface aux deux bouts (fenêtre de studio sur du verre). */
const streak = (ctx: Ctx, x: number, y0: number, y1: number, width: number, alpha: number) => {
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x - width / 2, y0, width, y1 - y0, width / 2);
  ctx.fillStyle = linear(ctx, 0, y0, 0, y1, [
    [0, 'rgba(255,255,255,0)'],
    [0.12, `rgba(255,255,255,${alpha})`],
    [0.7, `rgba(255,255,255,${alpha * 0.65})`],
    [1, 'rgba(255,255,255,0)'],
  ]);
  ctx.fill();
  ctx.restore();
};

/** Ombre propre : sombre sous le bouchon, sombre vers le bas, pour donner le volume. */
const verticalShade = (ctx: Ctx, top: number, bottom: number, topAlpha: number, bottomAlpha: number, topSpan = 0.16, bottomSpan = 0.28) => {
  ctx.fillStyle = linear(ctx, 0, top, 0, bottom, [
    [0, `rgba(20,8,4,${topAlpha})`],
    [topSpan, 'rgba(20,8,4,0)'],
    [1 - bottomSpan, 'rgba(20,8,4,0)'],
    [1, `rgba(20,8,4,${bottomAlpha})`],
  ]);
  ctx.fillRect(-60, top, 120, bottom - top);
};

const dot = (ctx: Ctx, x: number, y: number, r: number, alpha: number) => {
  ctx.beginPath();
  ctx.fillStyle = radial(ctx, x, y, 0, r, [
    [0, `rgba(255,255,255,${alpha})`],
    [1, 'rgba(255,255,255,0)'],
  ]);
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
};

/** Moletage d'un bouchon cylindrique : traits verticaux, serrés vers les bords (c'est une surface courbe). */
const knurl = (ctx: Ctx, halfWidth: number, top: number, bottom: number, ry: number) => {
  ctx.save();
  ctx.lineWidth = 0.7;
  for (let angle = -80; angle <= 80; angle += 5) {
    const radians = (angle * Math.PI) / 180;
    const x = halfWidth * Math.sin(radians);
    const end = bottom + ry * Math.cos(radians);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, end);
    ctx.strokeStyle = `rgba(0,0,0,${0.1 + 0.08 * Math.cos(radians)})`;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 0.9, top);
    ctx.lineTo(x + 0.9, end);
    ctx.strokeStyle = `rgba(255,255,255,${0.1 * Math.cos(radians)})`;
    ctx.stroke();
  }
  ctx.restore();
};

/** Bouchon métallique cylindrique, vu légèrement de dessus : flanc moleté, face du dessus elliptique, joint sombre dessous. */
const metalCap = (ctx: Ctx, m: Metal, halfWidth: number, top: number, bottom: number, ry: number, knurled = true) => {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-halfWidth, top);
  ctx.lineTo(-halfWidth, bottom);
  ctx.ellipse(0, bottom, halfWidth, ry, 0, Math.PI, 0, true);
  ctx.lineTo(halfWidth, top);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, -halfWidth, 0, halfWidth, 0, metalStops(m));
  ctx.fill();
  ctx.clip();
  verticalShade(ctx, top - ry, bottom + ry, 0.0, 0.34, 0.01, 0.34);
  if (knurled) knurl(ctx, halfWidth, top, bottom, ry);
  ctx.restore();

  // Face du dessus.
  ctx.beginPath();
  ctx.ellipse(0, top, halfWidth, ry, 0, 0, TAU);
  ctx.fillStyle = radial(ctx, -halfWidth * 0.25, top - ry * 0.25, 1, halfWidth * 1.05, [
    [0, metal(m, 94)],
    [0.55, metal(m, 72)],
    [1, metal(m, 46)],
  ]);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(0, top, halfWidth - 0.5, ry - 0.5, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, top, halfWidth - 5, Math.max(1, ry - 2.4), 0, 0, TAU);
  ctx.stroke();

  // Joint sombre entre le bouchon et le contenant.
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, bottom, halfWidth - 0.4, ry - 0.2, 0, 0.02, Math.PI - 0.02);
  ctx.stroke();
};

/** Verre épais : liseré clair sur les arêtes, lumière qui traverse en bas (caustique). */
const glassEdges = (ctx: Ctx, p: PotPalette, left: number, right: number, top: number, bottom: number) => {
  ctx.fillStyle = linear(ctx, left, 0, left + 7, 0, [
    [0, 'rgba(255,255,255,0.0)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  ctx.fillStyle = linear(ctx, 0, bottom - 10, 0, bottom, [
    [0, tone(p, 22, 0)],
    [1, tone(p, 24, 0.5)],
  ]);
  ctx.fillRect(left, bottom - 10, right - left, 10);
  ctx.fillStyle = linear(ctx, right - 9, 0, right, 0, [
    [0, 'rgba(255,255,255,0)'],
    [1, 'rgba(255,255,255,0.22)'],
  ]);
  ctx.fillRect(right - 9, top, 9, bottom - top);
};

// ---------------------------------------------------------------------------------------------------------------
// 1. Pot de crème : verre dépoli, bouchon à vis moleté
// ---------------------------------------------------------------------------------------------------------------
function drawJar(ctx: Ctx, p: PotPalette, paletteIndex: number) {
  const m = metalAt(paletteIndex);
  const halfBody = 46;
  const top = -6;
  const bottom = 30;
  const ry = 8;
  ctx.translate(0, 2);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-halfBody, top);
  ctx.lineTo(-halfBody, bottom);
  ctx.ellipse(0, bottom, halfBody, ry, 0, Math.PI, 0, true);
  ctx.lineTo(halfBody, top);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, -halfBody, 0, halfBody, 0, cylinderStops(p, 4, Math.max(18, p.s - 14)));
  ctx.fill();
  ctx.clip();
  verticalShade(ctx, top - 4, bottom + ry, 0.38, 0.32, 0.2, 0.3);
  glassEdges(ctx, p, -halfBody, halfBody, top, bottom + ry);
  // Bandeau vierge (aucune marque, aucun texte) : une bande plus claire, deux filets.
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(-halfBody, 10, halfBody * 2, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(-halfBody, 10, halfBody * 2, 0.8);
  ctx.fillRect(-halfBody, 19.4, halfBody * 2, 0.8);
  streak(ctx, -33, top + 6, bottom - 2, 6, 0.5);
  streak(ctx, -22, top + 10, bottom - 8, 1.8, 0.4);
  streak(ctx, 38, top + 8, bottom - 4, 2.4, 0.2);
  dot(ctx, -30, 2, 4.5, 0.55);
  ctx.restore();

  // Arête du bas (épaisseur du verre).
  ctx.beginPath();
  ctx.ellipse(0, bottom, halfBody - 1, ry - 1, 0, 0.1, Math.PI - 0.1);
  ctx.strokeStyle = tone(p, 26, 0.6);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  metalCap(ctx, m, 48, -34, -6, 8);
  // Reflet en travers du bouchon.
  ctx.save();
  ctx.beginPath();
  ctx.rect(-48, -34, 96, 28);
  ctx.clip();
  ctx.fillStyle = linear(ctx, 0, -34, 0, -6, [
    [0, 'rgba(255,255,255,0.28)'],
    [0.35, 'rgba(255,255,255,0)'],
  ]);
  ctx.fillRect(-48, -34, 96, 28);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------
// 2. Flacon pompe : plastique brillant, collerette métal, tête de pompe avec bec
// ---------------------------------------------------------------------------------------------------------------
function drawPump(ctx: Ctx, p: PotPalette, paletteIndex: number) {
  const m = metalAt(paletteIndex);
  ctx.translate(-3, 2);

  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-27, 38);
    ctx.lineTo(-27, -2);
    ctx.bezierCurveTo(-27, -13, -20, -18, -12, -21);
    ctx.lineTo(12, -21);
    ctx.bezierCurveTo(20, -18, 27, -13, 27, -2);
    ctx.lineTo(27, 38);
    ctx.quadraticCurveTo(27, 52, 14, 52);
    ctx.lineTo(-14, 52);
    ctx.quadraticCurveTo(-27, 52, -27, 38);
    ctx.closePath();
  };

  ctx.save();
  body();
  ctx.fillStyle = linear(ctx, -27, 0, 27, 0, cylinderStops(p, 2));
  ctx.fill();
  ctx.clip();
  verticalShade(ctx, -21, 52, 0.3, 0.3, 0.18, 0.3);
  // Niveau du produit : plus saturé et plus dense sous la ligne, ménisque lumineux.
  ctx.fillStyle = tone(p, -2, 0.28, Math.min(95, p.s + 12));
  ctx.fillRect(-27, 12, 54, 42);
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.fillRect(-27, 11.4, 54, 1.2);
  glassEdges(ctx, p, -27, 27, -21, 52);
  streak(ctx, -17, -14, 44, 6.5, 0.62);
  streak(ctx, -9, -8, 36, 1.6, 0.4);
  streak(ctx, 21, -4, 42, 2.4, 0.22);
  dot(ctx, -16, -8, 5, 0.6);
  ctx.restore();

  // Collerette métal à stries.
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, -15, -32, 30, 12, 2.5);
  ctx.fillStyle = linear(ctx, -15, 0, 15, 0, metalStops(m));
  ctx.fill();
  ctx.clip();
  for (const y of [-29.5, -26.5, -23.5]) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(-15, y, 30, 0.8);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(-15, y + 0.8, 30, 0.6);
  }
  verticalShade(ctx, -32, -20, 0.0, 0.3, 0.01, 0.4);
  ctx.restore();

  // Tige.
  ctx.beginPath();
  roundRect(ctx, -5, -44, 10, 13, 1.5);
  ctx.fillStyle = linear(ctx, -5, 0, 5, 0, metalStops(m));
  ctx.fill();

  // Tête de pompe : corps rond lustré + bec.
  const dark = { ...p, s: Math.min(p.s, 26), l: 22 } satisfies PotPalette;
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, -17, -58, 36, 15, [8, 8, 4, 4]);
  ctx.moveTo(19, -54);
  ctx.lineTo(36, -53);
  ctx.quadraticCurveTo(39, -53, 39, -50);
  ctx.quadraticCurveTo(39, -47, 36, -47);
  ctx.lineTo(19, -47);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, 0, -58, 0, -43, [
    [0, tone(dark, 30)],
    [0.35, tone(dark, 14)],
    [1, tone(dark, -12)],
  ]);
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = linear(ctx, -17, 0, 39, 0, [
    [0, 'rgba(255,255,255,0.0)'],
    [0.2, 'rgba(255,255,255,0.22)'],
    [0.45, 'rgba(255,255,255,0)'],
    [1, 'rgba(0,0,0,0.18)'],
  ]);
  ctx.fillRect(-17, -58, 56, 15);
  ctx.restore();
  ctx.beginPath();
  roundRect(ctx, -12, -56.5, 22, 2.2, 1.1);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  // Orifice du bec.
  ctx.beginPath();
  ctx.ellipse(38.4, -50, 0.9, 1.7, 0, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------------------------
// 3. Compte-gouttes : verre teinté, collerette, poire en caoutchouc
// ---------------------------------------------------------------------------------------------------------------
function drawDropper(ctx: Ctx, p: PotPalette, paletteIndex: number) {
  const m = metalAt(paletteIndex);
  const glass = { ...p, l: Math.max(30, p.l - 16), s: Math.min(88, p.s + 10) } satisfies PotPalette;
  ctx.translate(0, 6);

  const bottle = () => {
    ctx.beginPath();
    ctx.moveTo(-30, 28);
    ctx.lineTo(-30, 2);
    ctx.bezierCurveTo(-30, -8, -20, -10, -14, -14);
    ctx.lineTo(-13, -20);
    ctx.lineTo(13, -20);
    ctx.lineTo(14, -14);
    ctx.bezierCurveTo(20, -10, 30, -8, 30, 2);
    ctx.lineTo(30, 28);
    ctx.quadraticCurveTo(30, 40, 18, 40);
    ctx.lineTo(-18, 40);
    ctx.quadraticCurveTo(-30, 40, -30, 28);
    ctx.closePath();
  };

  ctx.save();
  bottle();
  ctx.fillStyle = linear(ctx, -30, 0, 30, 0, cylinderStops(glass, 0));
  ctx.fill();
  ctx.clip();
  verticalShade(ctx, -20, 40, 0.34, 0.3, 0.2, 0.3);
  // Le liquide, plus clair, laisse passer la lumière : une lueur chaude dans le verre.
  ctx.fillStyle = linear(ctx, -30, 0, 30, 0, [
    [0, tone(glass, 12, 0)],
    [0.3, tone(glass, 30, 0.42)],
    [0.7, tone(glass, 22, 0.3)],
    [1, tone(glass, 8, 0)],
  ]);
  ctx.fillRect(-30, -2, 60, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(-30, -2.6, 60, 1.2);
  // Pipette en verre, vue au travers.
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(-4, -20, 8, 52);
  ctx.fillStyle = 'rgba(255,255,255,0.34)';
  ctx.fillRect(-4, -20, 1.4, 52);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(2.6, -20, 1.4, 52);
  // Fond de verre épais.
  ctx.fillStyle = linear(ctx, 0, 28, 0, 40, [
    [0, tone(glass, 30, 0)],
    [1, tone(glass, 34, 0.5)],
  ]);
  ctx.fillRect(-30, 28, 60, 12);
  ctx.fillStyle = linear(ctx, 20, 0, 30, 0, [
    [0, 'rgba(255,255,255,0)'],
    [1, 'rgba(255,255,255,0.24)'],
  ]);
  ctx.fillRect(20, -10, 10, 50);
  streak(ctx, -21, -6, 32, 6, 0.6);
  streak(ctx, -12, 0, 26, 1.6, 0.4);
  dot(ctx, -20, 0, 5, 0.55);
  ctx.restore();

  // Collerette argentée.
  metalCap(ctx, m, 15, -30, -20, 3.2, false);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-15, -30, 30, 10);
  ctx.clip();
  for (const y of [-27.5, -24.5]) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(-15, y, 30, 0.8);
  }
  ctx.restore();

  // Poire en caoutchouc : noire, légèrement brillante.
  const rubber = { h: p.h, s: 14, l: 17 } satisfies PotPalette;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-9, -30);
  ctx.bezierCurveTo(-13, -38, -9, -48, -5, -56);
  ctx.bezierCurveTo(-3, -60, 3, -60, 5, -56);
  ctx.bezierCurveTo(9, -48, 13, -38, 9, -30);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, -12, 0, 12, 0, [
    [0, tone(rubber, -8)],
    [0.28, tone(rubber, 24)],
    [0.5, tone(rubber, 10)],
    [0.85, tone(rubber, -4)],
    [1, tone(rubber, -10)],
  ]);
  ctx.fill();
  ctx.clip();
  verticalShade(ctx, -60, -30, 0.18, 0.4, 0.2, 0.4);
  streak(ctx, -5, -54, -34, 3.2, 0.5);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------
// 4. Tube : plastique satiné, soudure plate striée, bouchon brillant
// ---------------------------------------------------------------------------------------------------------------
function drawTube(ctx: Ctx, p: PotPalette) {
  // Tube debout sur son bouchon : plus haut et plus étroit qu'un pot, soudure plate en haut, épaule qui rejoint le bouchon.
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(-11, 38);
    ctx.bezierCurveTo(-11, 31, -22, 30, -22, 18);
    ctx.lineTo(-23, -44);
    ctx.lineTo(23, -44);
    ctx.lineTo(22, 18);
    ctx.bezierCurveTo(22, 30, 11, 31, 11, 38);
    ctx.closePath();
  };

  ctx.save();
  shape();
  ctx.fillStyle = linear(ctx, -23, 0, 23, 0, cylinderStops(p, 3, Math.min(90, p.s + 6)));
  ctx.fill();
  ctx.clip();
  verticalShade(ctx, -44, 38, 0.1, 0.34, 0.06, 0.34);
  // Près de la soudure le tube est aplati : la matière s'assombrit sur quelques millimètres.
  ctx.fillStyle = linear(ctx, 0, -44, 0, -28, [
    [0, 'rgba(0,0,0,0.18)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  ctx.fillRect(-23, -44, 46, 16);
  // Bande plus claire, sans texte : seule indication d'une « étiquette ».
  ctx.fillStyle = tone(p, 22, 0.2, Math.max(20, p.s - 20));
  ctx.beginPath();
  ctx.moveTo(-23, -4);
  ctx.lineTo(23, -12);
  ctx.lineTo(23, 0);
  ctx.lineTo(-23, 8);
  ctx.closePath();
  ctx.fill();
  streak(ctx, -14, -36, 22, 5.4, 0.5);
  streak(ctx, -7, -32, 10, 1.5, 0.3);
  streak(ctx, 17, -36, 16, 2.2, 0.16);
  ctx.restore();

  // Soudure plate du haut : lamelles fines, bords légèrement évasés.
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, -25, -55, 50, 12, [1.5, 1.5, 0, 0]);
  ctx.fillStyle = linear(ctx, -25, 0, 25, 0, cylinderStops(p, -2, Math.min(90, p.s + 4)));
  ctx.fill();
  ctx.clip();
  for (let y = -54; y < -44; y += 1.9) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(-25, y, 50, 0.7);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(-25, y + 0.7, 50, 0.55);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(-25, -55, 50, 1.2);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-25, -43);
  ctx.lineTo(25, -43);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Bouchon : plastique clair brillant.
  const cap = { h: p.h, s: Math.min(p.s, 18), l: 92 } satisfies PotPalette;
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, -12.5, 37, 25, 19, [2, 2, 5, 5]);
  ctx.fillStyle = linear(ctx, -12.5, 0, 12.5, 0, cylinderStops(cap, 0, cap.s));
  ctx.fill();
  ctx.clip();
  verticalShade(ctx, 37, 56, 0.22, 0.28, 0.2, 0.3);
  streak(ctx, -6, 39, 54, 3, 0.7);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-12.5, 37.4);
  ctx.lineTo(12.5, 37.4);
  ctx.stroke();
}

// ---------------------------------------------------------------------------------------------------------------
// 5. Bouteille : verre teinté, épaule arrondie, étiquette vierge, bouchon métal
// ---------------------------------------------------------------------------------------------------------------
function drawBottle(ctx: Ctx, p: PotPalette, paletteIndex: number) {
  const m = metalAt(paletteIndex + 1);
  const glass = { ...p, l: Math.max(32, p.l - 12), s: Math.min(86, p.s + 6) } satisfies PotPalette;
  ctx.translate(0, 4);

  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(-24, 48);
    ctx.lineTo(-24, 0);
    ctx.bezierCurveTo(-24, -12, -11, -14, -10, -26);
    ctx.lineTo(-10, -34);
    ctx.lineTo(10, -34);
    ctx.lineTo(10, -26);
    ctx.bezierCurveTo(11, -14, 24, -12, 24, 0);
    ctx.lineTo(24, 48);
    ctx.quadraticCurveTo(24, 56, 16, 56);
    ctx.lineTo(-16, 56);
    ctx.quadraticCurveTo(-24, 56, -24, 48);
    ctx.closePath();
  };

  ctx.save();
  shape();
  ctx.fillStyle = linear(ctx, -24, 0, 24, 0, cylinderStops(glass, 0));
  ctx.fill();
  ctx.clip();
  verticalShade(ctx, -34, 56, 0.3, 0.3, 0.14, 0.28);
  // Liquide : lueur plus claire qui traverse jusqu'à l'épaule.
  ctx.fillStyle = linear(ctx, -24, 0, 24, 0, [
    [0, tone(glass, 12, 0)],
    [0.3, tone(glass, 28, 0.4)],
    [0.7, tone(glass, 20, 0.28)],
    [1, tone(glass, 8, 0)],
  ]);
  ctx.fillRect(-24, -18, 48, 76);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(-24, -18.6, 48, 1.2);

  // Étiquette vierge : papier crème qui épouse le cylindre.
  ctx.fillStyle = linear(ctx, -24, 0, 24, 0, [
    [0, 'hsl(38 22% 62%)'],
    [0.2, 'hsl(40 40% 96%)'],
    [0.55, 'hsl(40 30% 88%)'],
    [0.9, 'hsl(38 22% 66%)'],
    [1, 'hsl(36 20% 52%)'],
  ]);
  ctx.fillRect(-24, 12, 48, 28);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(-24, 12, 48, 0.8);
  ctx.fillRect(-24, 39.2, 48, 0.8);
  ctx.fillStyle = tone(p, 0, 0.55);
  ctx.fillRect(-24, 17, 48, 1.8);
  ctx.fillRect(-24, 33, 48, 1.8);
  ctx.fillStyle = linear(ctx, 0, 12, 0, 40, [
    [0, 'rgba(0,0,0,0.12)'],
    [0.3, 'rgba(0,0,0,0)'],
  ]);
  ctx.fillRect(-24, 12, 48, 28);

  glassEdges(ctx, glass, -24, 24, -34, 56);
  streak(ctx, -16, -24, 8, 4.6, 0.6);
  streak(ctx, -16, 42, 54, 4.6, 0.45);
  streak(ctx, -9, -10, 8, 1.4, 0.4);
  streak(ctx, 19, -6, 50, 2.2, 0.2);
  dot(ctx, -15, -10, 5, 0.6);
  ctx.restore();

  // Bague du col puis bouchon métallique.
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, -11.5, -37, 23, 4, 1.2);
  ctx.fillStyle = linear(ctx, -11.5, 0, 11.5, 0, metalStops(m));
  ctx.fill();
  ctx.restore();
  metalCap(ctx, m, 13, -52, -37, 3.6, true);
}

/** Dessine un pot dans la boîte de dessin (centrée sur l'origine). */
export function drawPotShape(ctx: Ctx, kind: PotKind, palette: PotPalette, paletteIndex: number): void {
  ctx.save();
  switch (kind) {
    case 'jar':
      drawJar(ctx, palette, paletteIndex);
      break;
    case 'pump':
      drawPump(ctx, palette, paletteIndex);
      break;
    case 'dropper':
      drawDropper(ctx, palette, paletteIndex);
      break;
    case 'tube':
      drawTube(ctx, palette);
      break;
    case 'bottle':
      drawBottle(ctx, palette, paletteIndex);
      break;
  }
  ctx.restore();
}

export interface PotSprite {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  /** Pixels de l'image par unité de dessin. */
  scale: number;
}

/** Pré-dessine un pot dans une image : chaque image est ensuite recopiée à chaque tour d'animation (peu coûteux). */
export function createPotSprite(kind: PotKind, palette: PotPalette, paletteIndex: number, scale: number, makeCanvas: (width: number, height: number) => HTMLCanvasElement | OffscreenCanvas): PotSprite {
  const canvas = makeCanvas(Math.ceil(DESIGN.width * scale), Math.ceil(DESIGN.height * scale));
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (ctx) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);
    drawPotShape(ctx, kind, palette, paletteIndex);
  }
  return { canvas, scale };
}
