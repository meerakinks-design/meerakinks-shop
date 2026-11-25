import type { SmashEvent } from './engine';
import { CUT, potYaw } from './pose';

// Effets visuels de l'éclatement (D-19) : éclats, gouttes de crème, éclaboussure, onde de choc, points qui montent.
// Ils n'ont AUCUNE incidence sur le score ni sur les pots : le moteur ne les connaît pas. Aléatoire injectable (tests).

export interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  size: number;
  /** Sommets du morceau, autour de (0, 0). */
  points: ReadonlyArray<readonly [number, number]>;
  life: number;
  maxLife: number;
  paletteIndex: number;
  material: 'glass' | 'plastic';
}

export interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  paletteIndex: number;
}

export interface Splat {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  paletteIndex: number;
  petals: ReadonlyArray<{ angle: number; length: number; width: number }>;
}

export interface Ring {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
}

export interface CutHalf {
  x: number; y: number; vx: number; vy: number; angle: number; spin: number;
  life: number; maxLife: number; radius: number; paletteIndex: number;
  kind: SmashEvent['kind']; side: 'left' | 'right';
  /** Rotation propre du pot (3D) au moment de la coupe : la moitié part de là pour s'ouvrir. */
  yaw0: number;
}

/** Disque de crème qui apparaît au cœur de la coupe (3D) : il fait face à l'observateur le temps de la révélation. */
export interface CutCore {
  x: number; y: number; vx: number; vy: number; angle: number;
  life: number; maxLife: number; radius: number; paletteIndex: number;
  kind: SmashEvent['kind'];
}

/** Éclair le long de la coupe (axe vertical du pot, tourné de `angle`). */
export interface Flash {
  x: number; y: number; angle: number; radius: number;
  life: number; maxLife: number;
}

export type Material = 'glass' | 'plastic';

/** Gravité des éclats, en multiples de la hauteur du terrain par seconde² (un peu plus forte que celle des pots : ils sont petits). */
const SHARD_GRAVITY = 2.6;

export class Effects {
  shards: Shard[] = [];
  drops: Drop[] = [];
  splats: Splat[] = [];
  rings: Ring[] = [];
  popups: Popup[] = [];
  cutHalves: CutHalf[] = [];
  cores: CutCore[] = [];
  flashes: Flash[] = [];
  /** Amplitude (px) de la secousse de l'écran, qui décroît seule. Décor : sans effet sur le jeu. */
  shake = 0;

  constructor(private readonly random: () => number = Math.random) {}

  get active(): boolean {
    return this.shards.length + this.drops.length + this.splats.length + this.rings.length + this.popups.length + this.cutHalves.length + this.cores.length + this.flashes.length > 0 || this.shake > 0.05;
  }

  /** Éclatement d'un pot : le verre donne beaucoup d'éclats fins et brillants, le plastique peu de gros morceaux mats. */
  burst(event: SmashEvent, material: Material): void {
    const { x, y, radius, paletteIndex } = event;
    const yaw0 = potYaw(event.potId, event.angle);
    for (const side of ['left', 'right'] as const) {
      const direction = side === 'left' ? -1 : 1;
      this.cutHalves.push({ x: x + direction * radius * 0.18, y, vx: event.vx * 0.25 + direction * (55 + this.random() * 35), vy: event.vy * 0.2 - 35 - this.random() * 40, angle: event.angle, spin: direction * (1.2 + this.random() * 2), life: 0, maxLife: CUT.totalMs, radius, paletteIndex, kind: event.kind, side, yaw0 });
    }
    this.cores.push({ x, y, vx: event.vx * 0.25, vy: event.vy * 0.2 - 20, angle: event.angle, life: 0, maxLife: CUT.coreOutMs, radius, paletteIndex, kind: event.kind });
    this.flashes.push({ x, y, angle: event.angle, radius, life: 0, maxLife: CUT.flashMs });
    // Un petit coup à l'écran, plus fort pour les petits pots (qui rapportent le plus).
    this.shake = Math.max(this.shake, 2 + 36 / Math.max(20, radius) * 1.6);
    const scale = radius / 36;
    const shardCount = Math.round((material === 'glass' ? 18 : 10) * (0.8 + 0.4 * this.random()));
    for (let index = 0; index < shardCount; index += 1) {
      const angle = this.random() * Math.PI * 2;
      const speed = (120 + this.random() * 360) * scale;
      const size = (material === 'glass' ? 6 + this.random() * 11 : 8 + this.random() * 12) * scale;
      this.shards.push({
        x: x + Math.cos(angle) * radius * 0.3,
        y: y + Math.sin(angle) * radius * 0.3,
        vx: Math.cos(angle) * speed + event.vx * 0.3,
        vy: Math.sin(angle) * speed - 140 * scale + event.vy * 0.3,
        rot: this.random() * Math.PI * 2,
        spin: (this.random() - 0.5) * 14,
        size,
        points: this.polygon(size),
        life: 0,
        maxLife: 900 + this.random() * 500,
        paletteIndex,
        material,
      });
    }
    const dropCount = Math.round(11 + this.random() * 6);
    for (let index = 0; index < dropCount; index += 1) {
      const angle = this.random() * Math.PI * 2;
      const speed = (90 + this.random() * 300) * scale;
      this.drops.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 90 * scale,
        radius: (2.2 + this.random() * 4.6) * scale,
        life: 0,
        maxLife: 700 + this.random() * 500,
        paletteIndex,
      });
    }
    const petalCount = 9 + Math.floor(this.random() * 4);
    this.splats.push({
      x,
      y,
      radius: radius * 0.95,
      life: 0,
      maxLife: 700,
      paletteIndex,
      petals: Array.from({ length: petalCount }, (_, index) => ({
        angle: (index / petalCount) * Math.PI * 2 + (this.random() - 0.5) * 0.4,
        length: radius * (0.6 + this.random() * 0.7),
        width: radius * (0.17 + this.random() * 0.15),
      })),
    });
    this.rings.push({ x, y, radius: radius * 1.5, life: 0, maxLife: 320 });
    this.popups.push({ x, y: y - radius * 0.4, text: `+${event.points}`, life: 0, maxLife: 800 });
  }

  update(dtMs: number, fieldHeight: number): void {
    const seconds = Math.min(dtMs, 50) / 1000;
    const gravity = SHARD_GRAVITY * fieldHeight;
    for (const shard of this.shards) {
      shard.life += dtMs;
      shard.vy += gravity * seconds;
      shard.vx *= 1 - 0.6 * seconds;
      shard.x += shard.vx * seconds;
      shard.y += shard.vy * seconds;
      shard.rot += shard.spin * seconds;
    }
    for (const drop of this.drops) {
      drop.life += dtMs;
      drop.vy += gravity * 0.8 * seconds;
      drop.vx *= 1 - 1.1 * seconds;
      drop.x += drop.vx * seconds;
      drop.y += drop.vy * seconds;
    }
    for (const splat of this.splats) splat.life += dtMs;
    for (const ring of this.rings) ring.life += dtMs;
    for (const popup of this.popups) {
      popup.life += dtMs;
      popup.y -= 46 * seconds;
    }
    for (const half of this.cutHalves) {
      half.life += dtMs;
      half.vy += gravity * 0.55 * seconds;
      half.x += half.vx * seconds;
      half.y += half.vy * seconds;
      half.angle += half.spin * seconds;
    }
    for (const core of this.cores) {
      core.life += dtMs;
      core.vy += gravity * 0.55 * seconds;
      core.x += core.vx * seconds;
      core.y += core.vy * seconds;
    }
    for (const flash of this.flashes) flash.life += dtMs;
    this.shake = this.shake > 0.05 ? this.shake * Math.max(0, 1 - 9 * seconds) : 0;
    this.shards = this.shards.filter((shard) => shard.life < shard.maxLife);
    this.drops = this.drops.filter((drop) => drop.life < drop.maxLife);
    this.splats = this.splats.filter((splat) => splat.life < splat.maxLife);
    this.rings = this.rings.filter((ring) => ring.life < ring.maxLife);
    this.popups = this.popups.filter((popup) => popup.life < popup.maxLife);
    this.cutHalves = this.cutHalves.filter((half) => half.life < half.maxLife);
    this.cores = this.cores.filter((core) => core.life < core.maxLife);
    this.flashes = this.flashes.filter((flash) => flash.life < flash.maxLife);
  }

  clear(): void {
    this.shards = [];
    this.drops = [];
    this.splats = [];
    this.rings = [];
    this.popups = [];
    this.cutHalves = [];
    this.cores = [];
    this.flashes = [];
    this.shake = 0;
  }

  /** Un morceau de verre : polygone irrégulier à 3 ou 4 sommets, plutôt allongé. */
  private polygon(size: number): ReadonlyArray<readonly [number, number]> {
    const count = 3 + Math.floor(this.random() * 2);
    const stretch = 0.6 + this.random() * 0.9;
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2 + (this.random() - 0.5) * 0.9;
      const radius = size * (0.55 + this.random() * 0.5);
      return [Math.cos(angle) * radius * stretch, Math.sin(angle) * radius] as const;
    });
  }
}
