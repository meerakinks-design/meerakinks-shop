import type { Effects } from './effects';
import { POT_KINDS, type PotKind, type SmashEngine } from './engine';
import { hslToRgb, type Pose, type Pots3D, type Rgb } from './gl3d';
import { tone, type PotPalette } from './palette';
import { CUT, POT_SPAN, PITCH, cutCoreScale, cutFlashAlpha, cutHalfOpacity, cutHalfSpread, cutHalfYaw, potPose } from './pose';
import { DESIGN, POT_MATERIAL, createPotSprite, type PotSprite } from './pots';
import type { SlashTrail } from './trail';

// Dessin d'une image du jeu sur le canvas. Le fond est celui de la page (CSS) : le canvas reste transparent.
// Les pots sont pré-dessinés une fois (une image par contenant et par couleur) puis recopiés : le tour d'animation reste léger.

const SPRITE_SCALE = 2.6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type MakeCanvas = (width: number, height: number) => HTMLCanvasElement | OffscreenCanvas;

export class SmashRenderer {
  private readonly sprites = new Map<string, PotSprite>();
  /** Pots en 3D (GLB) : absents tant qu'ils chargent ou si WebGL est indisponible, les pots dessinés prennent le relais. */
  private three: Pots3D | null = null;
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
    this.three?.resize(width, height, dpr);
  }

  /** Branche (ou retire) le rendu 3D des pots. */
  setThree(three: Pots3D | null): void {
    this.three = three;
    three?.resize(this.width, this.height, this.dpr);
  }

  /** Le rendu 3D est-il actif pour ce contenant ? */
  private uses3d(kind: PotKind): boolean {
    return Boolean(this.three && this.three.ready && this.three.hasModel(kind));
  }

  private tint(paletteIndex: number): Rgb {
    const { h, s, l } = this.palette(paletteIndex);
    return hslToRgb(h, s, l);
  }

  /** Crème : la couleur de la catégorie, éclaircie (même règle que l'éclaboussure). */
  private creamTint(paletteIndex: number): Rgb {
    const { h, s } = this.palette(paletteIndex);
    return hslToRgb(h, clamp(s - 8, 30, 66), 86);
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

  draw(engine: SmashEngine, effects: Effects, trail?: SlashTrail, now = 0): void {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    // Secousse brève à chaque coupe (décor).
    if (effects.shake > 0.05) ctx.translate(Math.sin(now * 0.11) * effects.shake, Math.cos(now * 0.13) * effects.shake * 0.8);

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
    for (const half of effects.cutHalves) if (!this.uses3d(half.kind)) this.drawCutHalf(half);

    for (const pot of engine.pots) {
      if (this.uses3d(pot.kind)) continue;
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
    // Les pots et les moitiés ouvertes passent devant les éclats et les gouttes : c'est la coupe qu'on veut voir.
    this.draw3d(engine, effects);

    for (const popup of effects.popups) this.drawPopup(popup);
    for (const flash of effects.flashes) this.drawFlash(flash);
    if (trail) this.drawTrail(trail, now);
  }

  /** Pots, moitiés ouvertes et disque de crème en 3D, recopiés dans le canvas 2D à leur place dans les couches. */
  private draw3d(engine: SmashEngine, effects: Effects): void {
    const three = this.three;
    if (!three || !three.ready) return;
    let drawn = false;
    const begin = () => {
      if (drawn) return;
      three.begin();
      drawn = true;
    };

    for (const half of effects.cutHalves) {
      if (!three.hasModel(half.kind)) continue;
      begin();
      const side = half.side === 'right' ? 'pos' : 'neg';
      three.drawHalf(
        half.kind,
        side,
        { x: half.x, y: half.y, size: half.radius * POT_SPAN, roll: half.angle, yaw: cutHalfYaw(half.side, half.yaw0, half.life), pitch: PITCH, opacity: cutHalfOpacity(half.life, half.maxLife), tint: this.tint(half.paletteIndex) },
        cutHalfSpread(half.life),
      );
    }
    for (const core of effects.cores) {
      if (!three.hasModel(core.kind)) continue;
      const grow = cutCoreScale(core.life);
      if (grow <= 0.01) continue;
      begin();
      const pose: Pose = { x: core.x, y: core.y, size: core.radius * POT_SPAN, roll: core.angle, yaw: Math.PI / 2 + 0.12 * Math.sin(core.life * 0.012), pitch: PITCH * 0.5, opacity: clamp(1 - Math.max(0, core.life - CUT.coreHoldMs) / (CUT.coreOutMs - CUT.coreHoldMs), 0, 1), tint: this.creamTint(core.paletteIndex) };
      three.drawCore(core.kind, pose, grow);
    }
    for (const pot of engine.pots) {
      if (!three.hasModel(pot.kind)) continue;
      begin();
      three.drawWhole(pot.kind, { ...potPose(pot), opacity: 1, tint: this.tint(pot.paletteIndex) });
    }
    if (drawn) this.ctx.drawImage(three.end(), 0, 0, this.width, this.height);
  }

  /** Éclair le long de la coupe : un trait vif, très bref, et une lueur au centre. */
  private drawFlash(flash: Effects['flashes'][number]) {
    const { ctx } = this;
    const alpha = cutFlashAlpha(flash.life);
    if (alpha <= 0.01) return;
    const length = flash.radius * 3;
    const dx = Math.sin(flash.angle) * length * 0.5;
    const dy = -Math.cos(flash.angle) * length * 0.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    const glow = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, flash.radius * 1.5);
    glow.addColorStop(0, 'rgba(255,255,255,0.85)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, flash.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(89,38,20,0.5)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(flash.x - dx, flash.y - dy);
    ctx.lineTo(flash.x + dx, flash.y + dy);
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }

  /** Traînée de coupe : un sillage blanc cerclé de brun chaud (lisible sur fond clair), fin et transparent vers la queue. */
  private drawTrail(trail: SlashTrail, now: number) {
    const { ctx } = this;
    const segments = trail.segments(now);
    if (segments.length === 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const layer of [
      { color: (alpha: number) => `rgba(140,60,36,${0.32 * alpha})`, extra: 7 },
      { color: (alpha: number) => `rgba(255,170,120,${0.62 * alpha})`, extra: 3.6 },
      { color: (alpha: number) => `rgba(255,255,255,${0.98 * alpha})`, extra: 0 },
    ]) {
      for (const segment of segments) {
        ctx.beginPath();
        ctx.moveTo(segment.x0, segment.y0);
        ctx.lineTo(segment.x1, segment.y1);
        ctx.lineWidth = segment.width + layer.extra * segment.alpha;
        ctx.strokeStyle = layer.color(segment.alpha);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawCutHalf(half: Effects['cutHalves'][number]) {
    const { ctx } = this;
    const sprite = this.sprite(half.kind, half.paletteIndex);
    const scale = (half.radius * POT_SPAN) / DESIGN.visualHeight;
    const progress = half.life / half.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - progress) * 1.4);
    ctx.translate(half.x, half.y);
    ctx.rotate(half.angle);
    ctx.scale(scale, scale);
    ctx.beginPath();
    if (half.side === 'left') ctx.rect(-DESIGN.width / 2 - 2, -DESIGN.height / 2 - 2, DESIGN.width / 2 + 2, DESIGN.height + 4);
    else ctx.rect(0, -DESIGN.height / 2 - 2, DESIGN.width / 2 + 2, DESIGN.height + 4);
    ctx.clip();
    ctx.drawImage(sprite.canvas as CanvasImageSource, -DESIGN.width / 2, -DESIGN.height / 2, DESIGN.width, DESIGN.height);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - progress) * 1.5);
    ctx.translate(half.x, half.y);
    ctx.rotate(half.angle);
    ctx.strokeStyle = 'rgba(255,248,231,0.95)';
    ctx.lineWidth = Math.max(1.2, half.radius * 0.045);
    ctx.beginPath();
    ctx.moveTo(0, -half.radius * 1.18);
    ctx.lineTo(0, half.radius * 1.18);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(89,38,20,0.72)';
    ctx.lineWidth = Math.max(0.8, half.radius * 0.02);
    ctx.stroke();
    ctx.restore();
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
