// Traînée de coupe : le sillage lumineux que laisse le doigt ou la souris pendant un balayage. PUR (le temps est passé en
// paramètre) : testé sans écran. Plus un point est ancien, plus il est fin et transparent ; la traînée disparaît d'elle-même.

export interface TrailPoint {
  x: number;
  y: number;
  /** Instant du point (ms, même horloge que `requestAnimationFrame`). */
  t: number;
  /** true : premier point d'un geste (aucun trait ne le relie au point précédent). */
  start: boolean;
}

export interface TrailSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Épaisseur du trait en pixels. */
  width: number;
  /** Opacité 0..1. */
  alpha: number;
}

export interface TrailOptions {
  /** Durée de vie d'un point, en ms. */
  lifeMs?: number;
  /** Nombre de points conservés au plus. */
  maxPoints?: number;
  /** Épaisseur maximale, à la pointe. */
  maxWidth?: number;
  /** Distance minimale (px) entre deux points : évite d'en empiler quand le doigt s'attarde. */
  minDistance?: number;
}

export class SlashTrail {
  points: TrailPoint[] = [];
  private readonly lifeMs: number;
  private readonly maxPoints: number;
  private readonly maxWidth: number;
  private readonly minDistance: number;

  constructor({ lifeMs = 260, maxPoints = 32, maxWidth = 12, minDistance = 2 }: TrailOptions = {}) {
    this.lifeMs = lifeMs;
    this.maxPoints = maxPoints;
    this.maxWidth = maxWidth;
    this.minDistance = minDistance;
  }

  /** Début d'un geste (doigt posé, bouton enfoncé). */
  begin(x: number, y: number, t: number): void {
    this.points.push({ x, y, t, start: true });
    this.trim();
  }

  /** Suite du geste. Un point trop proche du précédent est ignoré. */
  add(x: number, y: number, t: number): void {
    const last = this.points[this.points.length - 1];
    if (!last) {
      this.begin(x, y, t);
      return;
    }
    if (Math.hypot(x - last.x, y - last.y) < this.minDistance) return;
    this.points.push({ x, y, t, start: false });
    this.trim();
  }

  /** Retire les points périmés ; à appeler à chaque image. */
  prune(t: number): void {
    this.points = this.points.filter((point) => t - point.t < this.lifeMs);
  }

  clear(): void {
    this.points = [];
  }

  /** Reste-t-il quelque chose à dessiner (donc à animer) ? */
  isActive(t: number): boolean {
    return this.points.some((point) => t - point.t < this.lifeMs);
  }

  /** Les traits à dessiner : plus fins et plus transparents à mesure que leurs points vieillissent. */
  segments(t: number): TrailSegment[] {
    const out: TrailSegment[] = [];
    for (let index = 1; index < this.points.length; index += 1) {
      const from = this.points[index - 1] as TrailPoint;
      const to = this.points[index] as TrailPoint;
      if (to.start) continue;
      const life = Math.min(1, Math.max(0, 1 - (t - to.t) / this.lifeMs));
      if (life <= 0) continue;
      // Pointe épaisse, queue fine : à l'âge du point s'ajoute sa position dans le geste.
      const taper = 0.3 + 0.7 * (index / Math.max(1, this.points.length - 1));
      out.push({ x0: from.x, y0: from.y, x1: to.x, y1: to.y, width: Math.max(0.8, this.maxWidth * life ** 0.85 * taper), alpha: life });
    }
    return out;
  }

  private trim(): void {
    if (this.points.length > this.maxPoints) this.points.splice(0, this.points.length - this.maxPoints);
  }
}
