import type { Effects } from './effects';
import { POT_KINDS, type PotKind, type SmashEngine } from './engine';
import { tone, type PotPalette } from './palette';
import { DESIGN, POT_MATERIAL, createPotSprite, type PotSprite } from './pots';

// Dessin d'une image du jeu sur le canvas. Le fond est celui de la page (CSS) : le canvas reste transparent.
// Les pots sont pré-dessinés une fois (une image par contenant et par couleur) puis recopiés : le tour d'animation reste léger.

const SPRITE_SCALE = 2.6;
/** Un pot dessiné fait `radius × POT_SPAN` de haut. */
const POT_SPAN = 2.4;

type MakeCanvas = (width: number, height: number) => HTMLCanvasElement | OffscreenCanvas;

export class SmashRenderer {
  private readonly sprites = new Map<string, PotSprite>();
  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly palettes: readonly PotPalette[],
    private readonly makeCanvas: MakeCanvas,
    private readonly font = 'system-ui, sans-serif',
  ) {}

  resize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
  }

  private palette(index: number): PotPalette {
    return this.palettes[index % this.palettes.length] ?? { h: 340, s: 60, l: 70 };
  }

  private sprite(kind: PotKind, paletteIndex: number): PotSprite {
    const key = `${kind}-${paletteIndex}`;
    let sprite = this.sprites.get(key);
    if (!sprite) {
      sprite = createPotSprite(kind, this.palette(paletteIndex), paletteIndex, SPRITE_SCALE, this.makeCanvas);
      this.sprites.set(key, sprite);
    }
    return sprite;
  }

  /** Dessine tous les contenants (au premier lancement, pour ne pas ralentir la première seconde de jeu). */
  warmUp(): void {
    for (const kind of POT_KINDS) for (let index = 0; index < this.palettes.length; index += 1) this.sprite(kind, index);
  }

  draw(engine: SmashEngine, effects: Effects): void {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    // Ombres portées sur la « table » : plus le pot monte, plus son ombre est petite et claire.
    const floor = this.height - 12;
    for (const pot of engine.pots) {
      const above = Math.max(0, Math.min(1, (floor - pot.y) / (this.height * 0.9)));
      const visible = Math.max(0, Math.min(1, (this.height - pot.y + pot.radius) / (this.height * 0.35)));
      const alpha = 0.26 * (1 - above * 0.55) * visible;
      if (alpha <= 0.01) continue;
      const rx = pot.radius * (1.05 - above * 0.4);
      ctx.save();
      ctx.translate(pot.x, floor);
      ctx.scale(1, 0.22);
      const gradient = ctx.createRadialGradient(0, 0, 1, 0, 0, rx);
      gradient.addColorStop(0, `rgba(36,22,12,${alpha})`);
      gradient.addColorStop(1, 'rgba(36,22,12,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Éclaboussures de crème au fond (sous les pots et les éclats).
    for (const splat of effects.splats) this.drawSplat(splat);

    for (const pot of engine.pots) {
      const scale = (pot.radius * POT_SPAN) / DESIGN.visualHeight;
      ctx.save();
      ctx.translate(pot.x, pot.y);
      ctx.rotate(pot.angle);
      ctx.scale(scale, scale);
      ctx.drawImage(this.sprite(pot.kind, pot.paletteIndex).canvas as CanvasImageSource, -DESIGN.width / 2, -DESIGN.height / 2, DESIGN.width, DESIGN.height);
      ctx.restore();
    }

    for (const ring of effects.rings) {
      const progress = ring.life / ring.maxLife;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius * (0.35 + 0.65 * Math.sqrt(progress)), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * (1 - progress)})`;
      ctx.lineWidth = 3 * (1 - progress) + 0.5;
      ctx.stroke();
    }
    for (const drop of effects.drops) this.drawDrop(drop);
    for (const shard of effects.shards) this.drawShard(shard);
    for (const popup of effects.popups) this.drawPopup(popup);
  }

  private drawSplat(splat: Effects['splats'][number]) {
    const { ctx } = this;
    const palette = this.palette(splat.paletteIndex);
    const progress = splat.life / splat.maxLife;
    const grow = 1 - (1 - Math.min(1, progress * 3.2)) ** 3;
    // Opaque presque tout du long (des couches superposées transparaîtraient), disparition sur le dernier cinquième.
    const alpha = progress < 0.8 ? 1 : Math.max(0, (1 - progress) / 0.2);
    // Crème : la couleur du pot, éclaircie, mais assez dense pour se détacher d'un fond clair.
    const cream = { h: palette.h, s: Math.min(Math.max(palette.s - 8, 30), 66), l: 86 } satisfies PotPalette;
    // Chaque morceau (centre, jets, gouttes du bout) est tracé et rempli SÉPARÉMENT : réunis en un seul tracé, leurs sens
    // de rotation opposés laissent des trous là où ils se recouvrent.
    const pieces = (paint: () => void) => {
      ctx.beginPath();
      ctx.ellipse(0, 0, splat.radius * 0.8 * grow, splat.radius * 0.68 * grow, 0, 0, Math.PI * 2);
      paint();
      for (const petal of splat.petals) {
        const length = petal.length * grow;
        const cos = Math.cos(petal.angle);
        const sin = Math.sin(petal.angle);
        const base = splat.radius * 0.5;
        ctx.beginPath();
        ctx.moveTo(cos * base - sin * petal.width, sin * base + cos * petal.width);
        ctx.quadraticCurveTo(cos * length * 0.6 - sin * petal.width * 1.5, sin * length * 0.6 + cos * petal.width * 1.5, cos * length, sin * length);
        ctx.quadraticCurveTo(cos * length * 0.6 + sin * petal.width * 1.5, sin * length * 0.6 - cos * petal.width * 1.5, cos * base + sin * petal.width, sin * base - cos * petal.width);
        ctx.closePath();
        paint();
        ctx.beginPath();
        ctx.arc(cos * length, sin * length, petal.width * 1.15, 0, Math.PI * 2);
        paint();
      }
    };
    ctx.save();
    ctx.translate(splat.x, splat.y);
    ctx.globalAlpha = alpha;
    // Ombre portée, décalée : donne de l'épaisseur à la crème sur fond clair.
    ctx.save();
    ctx.translate(2.5, 4);
    ctx.fillStyle = 'rgba(70,36,30,0.22)';
    pieces(() => ctx.fill());
    ctx.restore();
    // Contour dessiné SOUS le remplissage : seul le bord extérieur reste visible.
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = tone(cream, -26, 0.6);
    pieces(() => ctx.stroke());
    // Corps de la crème.
    const body = ctx.createRadialGradient(-splat.radius * 0.2, -splat.radius * 0.25, 1, 0, 0, splat.radius * 1.3 * grow + 1);
    body.addColorStop(0, tone(cream, 9));
    body.addColorStop(0.55, tone(cream, 0));
    body.addColorStop(1, tone(cream, -12));
    ctx.fillStyle = body;
    pieces(() => ctx.fill());
    // Noix épaisse au centre, avec son brillant.
    ctx.beginPath();
    ctx.ellipse(0, 0, splat.radius * 0.34 * grow, splat.radius * 0.28 * grow, 0, 0, Math.PI * 2);
    ctx.fillStyle = tone(cream, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(-splat.radius * 0.12, -splat.radius * 0.14, splat.radius * 0.14 * grow, splat.radius * 0.07 * grow, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawDrop(drop: Effects['drops'][number]) {
    const { ctx } = this;
    const palette = this.palette(drop.paletteIndex);
    const cream = { h: palette.h, s: Math.min(Math.max(palette.s - 8, 30), 66), l: 86 } satisfies PotPalette;
    const progress = drop.life / drop.maxLife;
    const speed = Math.hypot(drop.vx, drop.vy);
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - progress) * 2);
    ctx.translate(drop.x, drop.y);
    ctx.rotate(Math.atan2(drop.vy, drop.vx));
    const stretch = 1 + Math.min(1.2, speed / 500);
    ctx.scale(stretch, 1);
    const gradient = ctx.createRadialGradient(-drop.radius * 0.35, -drop.radius * 0.35, 0.3, 0, 0, drop.radius);
    gradient.addColorStop(0, tone(cream, 12));
    gradient.addColorStop(1, tone(cream, -10));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, drop.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = tone(cream, -28, 0.5);
    ctx.stroke();
    ctx.restore();
  }

  private drawShard(shard: Effects['shards'][number]) {
    const { ctx } = this;
    const palette = this.palette(shard.paletteIndex);
    const progress = shard.life / shard.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - progress) * 2.2);
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.rot);
    ctx.beginPath();
    shard.points.forEach(([px, py], index) => (index === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    const gradient = ctx.createLinearGradient(-shard.size, -shard.size, shard.size, shard.size);
    if (shard.material === 'glass') {
      // Verre teinté : clair d'un côté, dense de l'autre, un peu translucide.
      gradient.addColorStop(0, tone(palette, 24, 0.95));
      gradient.addColorStop(0.5, tone(palette, 0, 0.88));
      gradient.addColorStop(1, tone(palette, -22, 0.95));
    } else {
      gradient.addColorStop(0, tone(palette, 12));
      gradient.addColorStop(1, tone(palette, -18));
    }
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1;
    ctx.strokeStyle = tone(palette, -34, 0.75);
    ctx.stroke();
    if (shard.material === 'glass') {
      // Arête qui accroche la lumière.
      const [first, second] = shard.points;
      if (first && second) {
        ctx.beginPath();
        ctx.moveTo(first[0], first[1]);
        ctx.lineTo(second[0], second[1]);
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawPopup(popup: Effects['popups'][number]) {
    const { ctx } = this;
    const progress = popup.life / popup.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - progress) * 2);
    ctx.font = `800 ${Math.round(18 + 6 * Math.max(0, 1 - progress * 4))}px ${this.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(34,24,18,0.85)';
    ctx.strokeText(popup.text, popup.x, popup.y);
    ctx.fillStyle = '#fff';
    ctx.fillText(popup.text, popup.x, popup.y);
    ctx.restore();
  }
}

/** Matière d'un contenant : décide du type d'éclats (verre fin et brillant, ou plastique en gros morceaux mats). */
export const materialOf = (kind: PotKind): 'glass' | 'plastic' => POT_MATERIAL[kind];
