// Attitude des pots en 3D et chorégraphie de la coupe (D-19). PUR : testé sans écran. Tout ici est du DÉCOR : le
// moteur (engine.ts) ne connaît ni la rotation 3D ni l'animation de coupe, qui n'influencent jamais le score.

/** Un pot dessiné fait `radius × POT_SPAN` de haut (même règle que les pots dessinés en 2D). */
export const POT_SPAN = 2.4;

/** Inclinaison vers l'observateur (radians) : laisse voir le dessus des pots. */
export const PITCH = 0.2;

/** Un pot tourne sur lui-même d'au plus ± cet angle (radians) : on voit ses côtés sans jamais le prendre de dos. */
export const MAX_YAW = 0.7;

export interface PotLike {
  id: number;
  x: number;
  y: number;
  angle: number;
  radius: number;
}

/** Rotation propre d'un pot : continue (suit l'angle qui évolue avec le temps) et déphasée d'un pot à l'autre. */
export const potYaw = (potId: number, angle: number): number => MAX_YAW * Math.sin(angle * 1.3 + potId * 2.1);

export interface PotPose {
  x: number;
  y: number;
  size: number;
  roll: number;
  yaw: number;
  pitch: number;
}

export function potPose(pot: PotLike): PotPose {
  return { x: pot.x, y: pot.y, size: pot.radius * POT_SPAN, roll: pot.angle, yaw: potYaw(pot.id, pot.angle), pitch: PITCH };
}

// ---------------------------------------------------------------------------
// La coupe : les moitiés s'ouvrent comme un livre pour montrer leur face de coupe, le disque de crème apparaît au
// centre, puis tout s'efface. Durées en millisecondes depuis l'instant de la coupe.
// ---------------------------------------------------------------------------

export const CUT = {
  /** Durée totale de l'animation (moitiés, disque de crème). */
  totalMs: 780,
  /** Les moitiés pivotent jusqu'à présenter leur face de coupe à l'observateur. */
  swingMs: 430,
  /** Angle final de chaque moitié (radians) : un peu en deçà de 90°, la face de coupe est alors presque de face. */
  swingYaw: 1.42,
  /** Écartement final de chaque moitié, en hauteurs de pot. */
  spread: 0.16,
  /** Le disque de crème apparaît (0 → 1), reste, puis disparaît. */
  coreInMs: 130,
  coreHoldMs: 330,
  coreOutMs: 560,
  /** Éclair le long de la coupe. */
  flashMs: 170,
} as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Courbe qui dépasse légèrement sa cible avant de s'y poser : le « rebond » d'un geste vif. */
export function easeOutBack(t: number, overshoot = 1.5): number {
  const x = clamp01(t) - 1;
  return 1 + (overshoot + 1) * x * x * x + overshoot * x * x;
}

export const easeOutCubic = (t: number): number => 1 - (1 - clamp01(t)) ** 3;

/**
 * Rotation d'une moitié autour de son axe vertical : de la rotation du pot au moment de la coupe jusqu'à ± `swingYaw`
 * (la moitié de gauche pivote d'un côté, celle de droite de l'autre : leurs faces de coupe se tournent vers nous).
 */
export function cutHalfYaw(side: 'left' | 'right', yaw0: number, lifeMs: number): number {
  const target = side === 'right' ? CUT.swingYaw : -CUT.swingYaw;
  return yaw0 + (target - yaw0) * easeOutBack(lifeMs / CUT.swingMs);
}

/** Écartement supplémentaire de chaque moitié, en hauteurs de pot. */
export const cutHalfSpread = (lifeMs: number): number => CUT.spread * easeOutCubic(lifeMs / (CUT.swingMs * 1.1));

/** Opacité d'une moitié : pleine, puis fondue sur le dernier quart de sa vie. */
export const cutHalfOpacity = (lifeMs: number, maxMs: number): number => clamp01((1 - lifeMs / maxMs) / 0.28);

/** Échelle du disque de crème : grandit d'un coup (avec un léger rebond), tient, puis se résorbe. */
export function cutCoreScale(lifeMs: number): number {
  if (lifeMs < CUT.coreInMs) return easeOutBack(lifeMs / CUT.coreInMs, 1.2);
  if (lifeMs < CUT.coreHoldMs) return 1;
  if (lifeMs < CUT.coreOutMs) return 1 - easeOutCubic((lifeMs - CUT.coreHoldMs) / (CUT.coreOutMs - CUT.coreHoldMs));
  return 0;
}

/** Opacité de l'éclair de coupe : maximale au premier instant, nulle après `flashMs`. */
export const cutFlashAlpha = (lifeMs: number): number => (1 - clamp01(lifeMs / CUT.flashMs)) ** 1.5;
