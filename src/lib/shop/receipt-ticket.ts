// Reçu de commande façon ticket de caisse, dessiné en canvas puis exporté en PNG.
// Une seule source de dessin : l'image affichée dans l'animation d'impression ET le fichier téléchargé
// viennent du même code, ils ne peuvent pas diverger. Aucune dépendance externe.
//
// Règles du cahier respectées : aucun paiement n'est présenté comme reçu (RM-10, RM-25), frais et total
// « à confirmer » tant qu'ils ne sont pas fixés (RM-03), pied « ne constitue pas une facture » (P-35).
// Le reçu ne contient aucune donnée personnelle du client (ni nom, ni téléphone, ni adresse précise).

import { ORDER_NOTICE_CONFIRMATION_INTRO, ORDER_NOTICE_CONFIRMATION_STEPS, ORDER_THANKS } from '@/content/livraison';
import { RECEIPT_TEXT, upfrontLabel } from '@/content/receipt';
import { formatFcfa } from '@/lib/money';
import type { OrderRecap } from '@/lib/shop/order-types';

// ---------------------------------------------------------------------------
// Modèle (pur, testable sans navigateur)
// ---------------------------------------------------------------------------

export interface TicketLine {
  /** « 2 × Sérum éclat » */
  label: string;
  total: string;
  /** « 10 000 FCFA l’unité », seulement si la quantité dépasse 1. */
  unitNote: string | null;
}

export interface TicketTotal {
  label: string;
  value: string;
  emphasis: boolean;
}

export interface TicketModel {
  shopName: string;
  title: string;
  issuedLabel: string;
  reference: string;
  placeLabel: string;
  lines: TicketLine[];
  totals: TicketTotal[];
  stamp: string;
  stampNote: string;
  stepsIntro: string;
  steps: string[];
  thanks: string;
  footer: string;
  /** Texte encodé dans le code-barres : la référence de la commande. */
  barcodeText: string;
}

/** Le formatage français insère des espaces fines insécables que beaucoup de polices monospace ne dessinent pas. */
export const plain = (text: string): string => text.replace(/[\u202f\u00a0]/g, ' ');

const money = (amount: number): string => plain(formatFcfa(amount));
const moneyOrPending = (amount: number | null): string => (amount === null ? RECEIPT_TEXT.toConfirm : money(amount));

/** « 18 nov. 2026 · 06:26 », à l'heure d'Abidjan quel que soit le fuseau de l'appareil. */
export function formatIssuedAt(date: Date): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Abidjan',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('day')} ${part('month')} ${part('year')} · ${part('hour')}:${part('minute')}`;
}

export function buildTicketModel(order: OrderRecap, options: { shopName?: string | undefined; issuedAt: Date }): TicketModel {
  const totals: TicketTotal[] = [
    { label: RECEIPT_TEXT.subtotalLabel, value: money(order.subtotal), emphasis: false },
    { label: RECEIPT_TEXT.deliveryFeeLabel, value: moneyOrPending(order.deliveryFee), emphasis: false },
    { label: RECEIPT_TEXT.totalLabel, value: moneyOrPending(order.total), emphasis: true },
    { label: upfrontLabel(order.zoneType), value: moneyOrPending(order.upfrontAmount), emphasis: false },
  ];
  return {
    shopName: plain(options.shopName?.trim() || RECEIPT_TEXT.fallbackShopName),
    title: RECEIPT_TEXT.title,
    issuedLabel: formatIssuedAt(options.issuedAt),
    reference: order.reference,
    placeLabel: plain(order.placeLabel),
    lines: order.lines.map((line) => ({
      label: plain(`${line.quantity} × ${line.name}`),
      total: money(line.lineTotal),
      unitNote: line.quantity > 1 ? `${money(line.unitPrice)} l’unité` : null,
    })),
    totals,
    stamp: RECEIPT_TEXT.stamp,
    stampNote: RECEIPT_TEXT.stampNote,
    stepsIntro: ORDER_NOTICE_CONFIRMATION_INTRO,
    steps: [...ORDER_NOTICE_CONFIRMATION_STEPS],
    thanks: ORDER_THANKS,
    footer: RECEIPT_TEXT.footer,
    barcodeText: order.reference,
  };
}

/** Nom du fichier téléchargé. La référence est déjà au format sûr CMD-XXXXXXXX. */
export const receiptFilename = (reference: string): string => `recu-${reference}.png`;

/** Texte alternatif de l'image du ticket (jamais « paiement reçu »). */
export function ticketAltText(order: OrderRecap): string {
  const total = order.total === null ? `sous-total ${money(order.subtotal)}, frais et total à confirmer` : `total ${money(order.total)}`;
  return `Reçu de commande ${order.reference} : ${total}. Paiement non reçu à ce stade.`;
}

// ---------------------------------------------------------------------------
// Code-barres Code 39 (lisible par n'importe quel lecteur ; la référence n'utilise que A-Z, 0-9 et « - »)
// ---------------------------------------------------------------------------

// 9 éléments par caractère (barre, espace, barre…) : n = étroit, w = large. Toujours 3 larges sur 9.
const CODE39: Readonly<Record<string, string>> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
};

export const CODE39_TABLE = CODE39;

export interface BarcodeRun {
  bar: boolean;
  wide: boolean;
}

export const isCode39Text = (text: string): boolean => text.length > 0 && [...text].every((char) => char !== '*' && char in CODE39);

/** Éléments du code (départ « * », texte, arrêt « * », un espace étroit entre deux caractères) ; null si non encodable. */
export function code39Runs(text: string): BarcodeRun[] | null {
  if (!isCode39Text(text)) return null;
  const runs: BarcodeRun[] = [];
  [...`*${text}*`].forEach((char, index) => {
    if (index > 0) runs.push({ bar: false, wide: false });
    [...(CODE39[char] as string)].forEach((element, position) => runs.push({ bar: position % 2 === 0, wide: element === 'w' }));
  });
  return runs;
}

// ---------------------------------------------------------------------------
// Découpage du texte (pur : la mesure est injectée)
// ---------------------------------------------------------------------------

export function wrapText(text: string, maxWidth: number, measure: (value: string) => number): string[] {
  const lines: string[] = [];
  let current = '';
  const push = (value: string) => {
    if (value) lines.push(value);
  };
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }
    push(current);
    current = '';
    if (measure(word) <= maxWidth) {
      current = word;
      continue;
    }
    // Mot plus large que la ligne : on le coupe au caractère.
    let chunk = '';
    for (const char of word) {
      if (measure(chunk + char) > maxWidth && chunk) {
        lines.push(chunk);
        chunk = '';
      }
      chunk += char;
    }
    current = chunk;
  }
  push(current);
  return lines;
}

/** Limite le nombre de lignes ; la dernière se termine par « … » quand du texte est coupé. */
export function clampLines(lines: string[], max: number, measure: (value: string) => number, maxWidth: number): string[] {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1] ?? '';
  while (last.length > 1 && measure(`${last}…`) > maxWidth) last = last.slice(0, -1);
  kept[max - 1] = `${last.trimEnd()}…`;
  return kept;
}

// ---------------------------------------------------------------------------
// Dessin (navigateur)
// ---------------------------------------------------------------------------

export interface TicketTheme {
  ink: string;
  muted: string;
  accent: string;
  backdrop: string;
}

const FALLBACK_THEME: TicketTheme = { ink: '#231f1c', muted: '#6b625b', accent: '#b42318', backdrop: '#faf7f2' };

/** Couleurs de la charte (tokens.css) : le reçu suivra la marque quand la charte remplacera les tokens provisoires. */
export function readTicketTheme(): TicketTheme {
  if (typeof document === 'undefined') return FALLBACK_THEME;
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    ink: token('--color-text', FALLBACK_THEME.ink),
    muted: token('--color-text-muted', FALLBACK_THEME.muted),
    accent: token('--color-danger', FALLBACK_THEME.accent),
    backdrop: token('--color-bg', FALLBACK_THEME.backdrop),
  };
}

const MONO = '"SF Mono", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, "Courier New", ui-monospace, monospace';
const PAPER_TOP = '#fffefb';
const PAPER_BOTTOM = '#f5f1e8';

/** Largeur logique du ticket ; l'image exportée est `TICKET_SCALE` fois plus large pour rester nette. */
export const TICKET_WIDTH = 360;
export const TICKET_SCALE = 3;
const PAD = 24;
const TOOTH = 12;
const TOOTH_DEPTH = 6;
const MAX_NAME_LINES = 3;
const BAR_NARROW = 4; // pixels de l'image (échelle comprise)
const BAR_WIDE = 10;

interface Painter {
  ctx: CanvasRenderingContext2D;
  draw: boolean;
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 400): void {
  ctx.font = `${weight} ${size}px ${MONO}`;
}

/** Texte espacé lettre à lettre (le support de `letterSpacing` varie selon les navigateurs). */
function spacedWidth(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  return [...text].reduce((sum, char) => sum + ctx.measureText(char).width + spacing, 0) - spacing;
}

function paintSpaced(p: Painter, text: string, centerX: number, y: number, size: number, weight: number, color: string, spacing: number): void {
  setFont(p.ctx, size, weight);
  if (!p.draw) return;
  p.ctx.fillStyle = color;
  p.ctx.textAlign = 'left';
  let x = centerX - spacedWidth(p.ctx, text, spacing) / 2;
  for (const char of text) {
    p.ctx.fillText(char, x, y);
    x += p.ctx.measureText(char).width + spacing;
  }
}

function paintText(p: Painter, text: string, x: number, y: number, size: number, weight: number, color: string, align: CanvasTextAlign = 'left'): void {
  setFont(p.ctx, size, weight);
  if (!p.draw) return;
  p.ctx.fillStyle = color;
  p.ctx.textAlign = align;
  p.ctx.fillText(text, x, y);
}

function paintDashed(p: Painter, y: number, color: string): void {
  if (!p.draw) return;
  const { ctx } = p;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(TICKET_WIDTH - PAD, y);
  ctx.stroke();
  ctx.restore();
}

function paintBarcode(p: Painter, runs: BarcodeRun[], y: number, height: number, color: string): void {
  // Largeur en pixels de l'image, ramenée en unités logiques ; on réduit si le code dépasse la largeur utile.
  const widthAt = (narrow: number, wide: number) => runs.reduce((sum, run) => sum + (run.wide ? wide : narrow), 0);
  const available = (TICKET_WIDTH - PAD * 2) * TICKET_SCALE;
  let narrow = BAR_NARROW;
  let wide = BAR_WIDE;
  if (widthAt(narrow, wide) > available) {
    narrow = 3;
    wide = 7;
  }
  const total = widthAt(narrow, wide) / TICKET_SCALE;
  if (!p.draw) return;
  const { ctx } = p;
  ctx.fillStyle = color;
  let x = (TICKET_WIDTH - total) / 2;
  for (const run of runs) {
    const w = (run.wide ? wide : narrow) / TICKET_SCALE;
    if (run.bar) ctx.fillRect(x, y, w, height);
    x += w;
  }
}

/** Dessine tout le ticket ; en mode mesure (`draw` faux) ne peint rien et renvoie seulement la hauteur utile. */
function paintTicket(p: Painter, model: TicketModel, theme: TicketTheme): number {
  const { ctx } = p;
  const center = TICKET_WIDTH / 2;
  const inner = TICKET_WIDTH - PAD * 2;
  const measure = (size: number, weight: number) => (value: string) => {
    setFont(ctx, size, weight);
    return ctx.measureText(value).width;
  };
  let y = 38;

  // --- En-tête ---
  paintSpaced(p, model.shopName.toUpperCase(), center, y, 16, 700, theme.ink, 2);
  y += 22;
  paintSpaced(p, model.title, center, y, 11, 700, theme.muted, 2.5);
  y += 17;
  paintText(p, model.issuedLabel, center, y, 11, 400, theme.muted, 'center');
  y += 18;
  paintDashed(p, y, theme.muted);
  y += 20;

  // --- Référence et destination ---
  paintText(p, RECEIPT_TEXT.referenceLabel, PAD, y, 11, 400, theme.muted);
  paintText(p, model.reference, TICKET_WIDTH - PAD, y, 13, 700, theme.ink, 'right');
  y += 19;
  if (model.placeLabel) {
    const placeLines = clampLines(wrapText(model.placeLabel, inner - 92, measure(12, 400)), 2, measure(12, 400), inner - 92);
    paintText(p, RECEIPT_TEXT.deliveryLabel, PAD, y, 11, 400, theme.muted);
    placeLines.forEach((line, index) => paintText(p, line, TICKET_WIDTH - PAD, y + index * 16, 12, 400, theme.ink, 'right'));
    y += placeLines.length * 16 + 3;
  }
  paintDashed(p, y, theme.muted);
  y += 21;

  // --- Articles ---
  for (const line of model.lines) {
    const priceWidth = measure(13, 700)(line.total);
    const maxName = inner - priceWidth - 12;
    const nameLines = clampLines(wrapText(line.label, maxName, measure(13, 400)), MAX_NAME_LINES, measure(13, 400), maxName);
    nameLines.forEach((text, index) => paintText(p, text, PAD, y + index * 17, 13, 400, theme.ink));
    paintText(p, line.total, TICKET_WIDTH - PAD, y, 13, 700, theme.ink, 'right');
    y += (nameLines.length - 1) * 17;
    if (line.unitNote) {
      y += 15;
      paintText(p, line.unitNote, PAD + 18, y, 10.5, 400, theme.muted);
    }
    y += 24;
  }
  y -= 6;
  paintDashed(p, y, theme.muted);
  y += 22;

  // --- Montants ---
  for (const row of model.totals) {
    const size = row.emphasis ? 15 : 12;
    const weight = row.emphasis ? 700 : 400;
    if (row.emphasis) y += 4;
    paintText(p, row.label, PAD, y, size, weight, row.emphasis ? theme.ink : theme.muted);
    paintText(p, row.value, TICKET_WIDTH - PAD, y, size, row.emphasis ? 700 : 600, theme.ink, 'right');
    y += row.emphasis ? 25 : 20;
  }
  y += 2;
  paintDashed(p, y, theme.muted);
  y += 26;

  // --- Tampon « paiement non reçu » (RM-10, RM-25) ---
  const stampWidth = inner - 28;
  const stampHeight = 66;
  if (p.draw) {
    ctx.save();
    ctx.translate(center, y + stampHeight / 2);
    ctx.rotate(-0.028);
    ctx.strokeStyle = theme.accent;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;
    roundedRectPath(ctx, -stampWidth / 2, -stampHeight / 2, stampWidth, stampHeight, 6);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    roundedRectPath(ctx, -stampWidth / 2 + 4, -stampHeight / 2 + 4, stampWidth - 8, stampHeight - 8, 3);
    ctx.stroke();
    const sub: Painter = { ctx, draw: true };
    paintSpaced(sub, model.stamp, 0, -9, 14, 700, theme.accent, 1.5);
    const noteLines = clampLines(wrapText(model.stampNote, stampWidth - 24, measure(9.5, 400)), 2, measure(9.5, 400), stampWidth - 24);
    noteLines.forEach((text, index) => paintText(sub, text, 0, 8 + index * 11.5, 9.5, 400, theme.accent, 'center'));
    ctx.restore();
  }
  y += stampHeight + 26;

  // --- Étapes suivantes (textes de content/livraison.ts) ---
  const introLines = wrapText(model.stepsIntro, inner, measure(10.5, 400));
  introLines.forEach((text, index) => paintText(p, text, PAD, y + index * 14, 10.5, 400, theme.muted));
  y += introLines.length * 14 + 5;
  for (const step of model.steps) {
    const stepLines = wrapText(step, inner - 16, measure(10.5, 400));
    paintText(p, '›', PAD + 2, y, 10.5, 700, theme.ink);
    stepLines.forEach((text, index) => paintText(p, text, PAD + 16, y + index * 14, 10.5, 400, theme.ink));
    y += stepLines.length * 14 + 3;
  }
  y += 14;

  // --- Code-barres de la référence ---
  const runs = code39Runs(model.barcodeText);
  if (runs) {
    paintBarcode(p, runs, y, 44, theme.ink);
    y += 44 + 15;
    paintSpaced(p, model.barcodeText, center, y, 11, 400, theme.muted, 3);
    y += 26;
  }

  // --- Pied ---
  paintDashed(p, y - 8, theme.muted);
  y += 12;
  paintText(p, model.thanks, center, y, 12, 700, theme.ink, 'center');
  y += 18;
  const footerLines = wrapText(model.footer, inner, measure(9.5, 400));
  footerLines.forEach((text, index) => paintText(p, text, center, y + index * 12, 9.5, 400, theme.muted, 'center'));
  y += footerLines.length * 12;

  return y + TOOTH_DEPTH + 26;
}

/** Petit générateur déterministe : la texture du papier est la même à chaque rendu d'une même commande. */
function seededRandom(seed: string): () => number {
  let state = 0;
  for (const char of seed) state = (Math.imul(state, 31) + char.charCodeAt(0)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sawtoothPath(ctx: CanvasRenderingContext2D, height: number): void {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(TICKET_WIDTH, 0);
  ctx.lineTo(TICKET_WIDTH, height - TOOTH_DEPTH);
  const teeth = Math.round(TICKET_WIDTH / TOOTH);
  const step = TICKET_WIDTH / teeth;
  for (let i = 0; i < teeth; i += 1) {
    const xRight = TICKET_WIDTH - i * step;
    ctx.lineTo(xRight - step / 2, height);
    ctx.lineTo(xRight - step, height - TOOTH_DEPTH);
  }
  ctx.closePath();
}

/** Rectangle à coins arrondis sans `roundRect` (absent des navigateurs un peu anciens). */
function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  return canvas;
}

/** Le ticket seul, fond transparent autour du papier (dents de scie en bas). */
export function renderTicketCanvas(model: TicketModel, theme: TicketTheme): HTMLCanvasElement {
  const scratch = createCanvas(1, 1).getContext('2d');
  if (!scratch) throw new Error('Canvas indisponible');
  scratch.scale(TICKET_SCALE, TICKET_SCALE);
  const height = Math.ceil(paintTicket({ ctx: scratch, draw: false }, model, theme));

  const canvas = createCanvas(TICKET_WIDTH * TICKET_SCALE, height * TICKET_SCALE);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.scale(TICKET_SCALE, TICKET_SCALE);

  // Papier : dégradé chaud, dents de scie en bas, fin grain.
  ctx.save();
  sawtoothPath(ctx, height);
  ctx.clip();
  const paper = ctx.createLinearGradient(0, 0, 0, height);
  paper.addColorStop(0, PAPER_TOP);
  paper.addColorStop(1, PAPER_BOTTOM);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, TICKET_WIDTH, height);
  const random = seededRandom(model.reference);
  for (let i = 0; i < 1100; i += 1) {
    ctx.fillStyle = `rgba(70, 55, 40, ${(0.02 + random() * 0.04).toFixed(3)})`;
    ctx.fillRect(random() * TICKET_WIDTH, random() * height, 1, 1);
  }
  paintTicket({ ctx, draw: true }, model, theme);
  ctx.restore();
  return canvas;
}

/** Version à télécharger : le ticket posé sur le fond de la charte, avec une ombre douce (joli une fois partagé). */
export function renderDownloadCanvas(ticket: HTMLCanvasElement, theme: TicketTheme): HTMLCanvasElement {
  const margin = 44 * TICKET_SCALE;
  const canvas = createCanvas(ticket.width + margin * 2, ticket.height + margin * 2);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.fillStyle = theme.backdrop;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.shadowColor = 'rgba(35, 31, 28, 0.22)';
  ctx.shadowBlur = 28 * TICKET_SCALE;
  ctx.shadowOffsetY = 10 * TICKET_SCALE;
  ctx.drawImage(ticket, margin, margin);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export PNG impossible'))), 'image/png');
  });
}

export interface RenderedReceipt {
  /** Ticket seul (fond transparent) : l'image qui sort de l'imprimante. */
  preview: Blob;
  /** Ticket sur fond de charte : le fichier téléchargé. */
  download: Blob;
  /** Dimensions logiques du ticket (pour réserver la place avant le chargement de l'image). */
  width: number;
  height: number;
}

export async function renderReceipt(model: TicketModel, theme: TicketTheme = readTicketTheme()): Promise<RenderedReceipt> {
  const ticket = renderTicketCanvas(model, theme);
  const [preview, download] = await Promise.all([toBlob(ticket), toBlob(renderDownloadCanvas(ticket, theme))]);
  return { preview, download, width: ticket.width / TICKET_SCALE, height: ticket.height / TICKET_SCALE };
}

/** Lance le téléchargement d'un fichier déjà en mémoire (aucun appel réseau). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Laisse au navigateur le temps de démarrer le téléchargement avant de libérer l'adresse.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
