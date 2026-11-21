// Moteur du mini-jeu « Cosmetic Smash » (cahier §4.6, D-19, P-42) : toute la LOGIQUE, aucun dessin, aucun accès au navigateur.
// Il avance par pas de temps (`step`) et reçoit des gestes (`slash`) : on le teste donc sans écran ni horloge réelle.
// Les valeurs marquées 🟡 dans le cahier (durée, tailles, points) sont les constantes de SMASH, faciles à régler.

export const SMASH = {
  /** Durée d'une partie : 30 s 🟡. */
  durationMs: 30_000,
  /** Gravité, en hauteurs de terrain par seconde² : la même sensation sur tous les écrans. */
  gravity: 2.1,
  /** Pots affichés en même temps, au plus. */
  maxPots: 8,
  /** Trois tailles de pots, les plus petits rapportant le plus 🟡. `radius` : rayon en pixels à l'échelle 1. */
  sizes: {
    large: { radius: 46, points: 10, weight: 0.4 },
    medium: { radius: 36, points: 20, weight: 0.35 },
    small: { radius: 27, points: 30, weight: 0.25 },
  },
  /** Délai entre deux pots : de 900 ms au début à 420 ms à la fin de la partie. */
  spawnStartMs: 900,
  spawnEndMs: 420,
  /** Un pas de temps plus long (onglet resté en arrière-plan) est ramené à cette valeur : jamais de pot qui « saute » l'écran. */
  maxStepMs: 50,
  /** Marge de toucher : un doigt est moins précis qu'une souris. */
  touchPad: 10,
  /** Un geste plus court que cela est un simple toucher (un seul pot) ; plus long, c'est un balayage (tous les pots croisés). */
  slashMinLength: 6,
} as const;

export type PotSize = keyof typeof SMASH.sizes;
export const POT_SIZES = Object.keys(SMASH.sizes) as PotSize[];

/** Contenants cosmétiques génériques, sans marque : pot de crème, flacon pompe, compte-gouttes, tube, bouteille. */
export const POT_KINDS = ['jar', 'pump', 'dropper', 'tube', 'bottle'] as const;
export type PotKind = (typeof POT_KINDS)[number];

export type EngineStatus = 'ready' | 'running' | 'paused' | 'over';

export interface Pot {
  id: number;
  kind: PotKind;
  size: PotSize;
  /** Indice dans la liste de palettes (couleurs des catégories). */
  paletteIndex: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  /** Rayon courant en pixels (taille × échelle de l'écran). */
  radius: number;
}

export interface SmashEvent {
  potId: number;
  kind: PotKind;
  size: PotSize;
  paletteIndex: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  points: number;
}

export interface EngineOptions {
  width: number;
  height: number;
  /** Nombre de palettes (couleurs de catégories) parmi lesquelles tirer la couleur d'un pot. */
  paletteCount: number;
  random?: () => number;
  durationMs?: number;
}

/** Générateur pseudo-aléatoire à graine : mêmes pots, même ordre (tests). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Échelle des pots selon la largeur du terrain : plus petits sur un téléphone, jamais démesurés sur un grand écran. */
export const unitForWidth = (width: number): number => Math.min(1.15, Math.max(0.78, width / 640));

/** Secondes restantes, arrondies au-dessus : « 30 s » au départ, « 1 s » jusqu'à la toute fin. */
export const secondsLeft = (ms: number): number => Math.max(0, Math.ceil(ms / 1000));

const lerp = (from: number, to: number, ratio: number) => from + (to - from) * ratio;

/** Distance entre le point (px, py) et le segment [(x0, y0), (x1, y1)]. */
export function distanceToSegment(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - x0, py - y0);
  const ratio = Math.min(1, Math.max(0, ((px - x0) * dx + (py - y0) * dy) / lengthSquared));
  return Math.hypot(px - (x0 + ratio * dx), py - (y0 + ratio * dy));
}

export class SmashEngine {
  status: EngineStatus = 'ready';
  score = 0;
  timeLeftMs: number;
  pots: Pot[] = [];
  width: number;
  height: number;
  unit: number;

  private readonly random: () => number;
  private readonly paletteCount: number;
  private readonly durationMs: number;
  private nextId = 1;
  private spawnInMs = 0;

  constructor(options: EngineOptions) {
    this.width = options.width;
    this.height = options.height;
    this.unit = unitForWidth(options.width);
    this.paletteCount = Math.max(1, options.paletteCount);
    this.random = options.random ?? Math.random;
    this.durationMs = options.durationMs ?? SMASH.durationMs;
    this.timeLeftMs = this.durationMs;
  }

  /** Nouvelle partie (depuis « Jouer », « Recommencer » ou « Rejouer ») : score à zéro, terrain vide, chronomètre plein. */
  start(): void {
    this.status = 'running';
    this.score = 0;
    this.timeLeftMs = this.durationMs;
    this.pots = [];
    this.spawnInMs = 250;
  }

  pause(): void {
    if (this.status === 'running') this.status = 'paused';
  }

  resume(): void {
    if (this.status === 'paused') this.status = 'running';
  }

  /** Le terrain change de taille (rotation du téléphone, fenêtre redimensionnée) : les pots restent dedans. */
  resize(width: number, height: number): void {
    const ratioX = this.width > 0 ? width / this.width : 1;
    const ratioY = this.height > 0 ? height / this.height : 1;
    this.width = width;
    this.height = height;
    const unit = unitForWidth(width);
    const change = unit / this.unit;
    this.unit = unit;
    for (const pot of this.pots) {
      pot.x *= ratioX;
      pot.y *= ratioY;
      pot.vx *= ratioX;
      pot.vy *= ratioY;
      pot.radius *= change;
    }
  }

  /** Avance le jeu de `dtMs` millisecondes. Ne fait rien en pause. Les pots encore en l'air continuent de tomber après la fin. */
  step(dtMs: number): void {
    if (this.status === 'paused' || this.status === 'ready') return;
    const dt = Math.min(Math.max(dtMs, 0), SMASH.maxStepMs);
    const seconds = dt / 1000;
    const gravityPx = SMASH.gravity * this.height;

    for (const pot of this.pots) {
      pot.vy += gravityPx * seconds;
      pot.x += pot.vx * seconds;
      pot.y += pot.vy * seconds;
      pot.angle += pot.spin * seconds;
    }
    this.pots = this.pots.filter((pot) => !(pot.vy > 0 && pot.y > this.height + pot.radius * 2) && pot.x > -pot.radius * 3 && pot.x < this.width + pot.radius * 3);

    if (this.status !== 'running') return;
    this.timeLeftMs -= dt;
    if (this.timeLeftMs <= 0) {
      this.timeLeftMs = 0;
      this.status = 'over';
      return;
    }
    this.spawnInMs -= dt;
    if (this.spawnInMs <= 0) {
      if (this.pots.length < SMASH.maxPots) this.spawn();
      const progress = 1 - this.timeLeftMs / this.durationMs;
      this.spawnInMs = lerp(SMASH.spawnStartMs, SMASH.spawnEndMs, progress) * (0.75 + 0.5 * this.random());
    }
  }

  /**
   * Un geste du doigt ou de la souris, du point (x0, y0) au point (x1, y1), en pixels du terrain.
   * Un simple toucher casse UN pot (le plus proche du doigt) ; un balayage casse tous les pots qu'il traverse.
   */
  slash(x0: number, y0: number, x1: number, y1: number, pad = 0): SmashEvent[] {
    if (this.status !== 'running') return [];
    const isTap = Math.hypot(x1 - x0, y1 - y0) < SMASH.slashMinLength;
    const reached = this.pots
      .filter((pot) => pot.y > -pot.radius && pot.y < this.height + pot.radius)
      .map((pot) => ({ pot, distance: distanceToSegment(pot.x, pot.y, x0, y0, x1, y1) }))
      .filter(({ pot, distance }) => distance <= pot.radius * 1.15 + pad);
    if (reached.length === 0) return [];
    if (isTap) {
      const nearest = reached.reduce((best, current) => (current.distance < best.distance ? current : best));
      return [this.smash(nearest.pot)];
    }
    return reached.map(({ pot }) => this.smash(pot));
  }

  /** Au clavier : casse le pot visible le plus bas, celui qui va sortir de l'écran (en priorité ceux qui retombent). */
  smashLowest(): SmashEvent[] {
    if (this.status !== 'running') return [];
    const visible = this.pots.filter((pot) => pot.y > -pot.radius && pot.y < this.height);
    if (visible.length === 0) return [];
    const falling = visible.filter((pot) => pot.vy > 0);
    const pool = falling.length > 0 ? falling : visible;
    const lowest = pool.reduce((best, current) => (current.y > best.y ? current : best));
    return [this.smash(lowest)];
  }

  private smash(pot: Pot): SmashEvent {
    this.pots = this.pots.filter((other) => other.id !== pot.id);
    const points = SMASH.sizes[pot.size].points;
    this.score += points;
    return { potId: pot.id, kind: pot.kind, size: pot.size, paletteIndex: pot.paletteIndex, x: pot.x, y: pot.y, vx: pot.vx, vy: pot.vy, angle: pot.angle, radius: pot.radius, points };
  }

  private pickSize(): PotSize {
    let roll = this.random();
    for (const size of POT_SIZES) {
      roll -= SMASH.sizes[size].weight;
      if (roll < 0) return size;
    }
    return 'large';
  }

  /** Un pot est lancé depuis le bas du terrain : il monte, atteint son sommet, puis retombe. */
  private spawn(): void {
    const size = this.pickSize();
    const radius = SMASH.sizes[size].radius * this.unit;
    const gravityPx = SMASH.gravity * this.height;
    const x = this.width * (0.1 + 0.8 * this.random());
    const apex = this.height * (0.5 + 0.38 * this.random());
    const vy = -Math.sqrt(2 * gravityPx * apex);
    const flightSeconds = (2 * -vy) / gravityPx;
    const targetX = this.width * (0.25 + 0.5 * this.random());
    this.pots.push({
      id: this.nextId++,
      kind: POT_KINDS[Math.floor(this.random() * POT_KINDS.length)] ?? 'jar',
      size,
      paletteIndex: Math.floor(this.random() * this.paletteCount),
      x,
      y: this.height + radius * 1.4,
      vx: (targetX - x) / flightSeconds,
      vy,
      angle: (this.random() - 0.5) * 0.8,
      spin: (this.random() - 0.5) * 3.2,
      radius,
    });
  }
}
