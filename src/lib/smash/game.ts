import { Effects } from './effects';
import { SMASH, SmashEngine, secondsLeft, type EngineStatus, type SmashEvent } from './engine';
import { buildPalettes } from './palette';
import { POT_MATERIAL } from './pots';
import { SmashRenderer } from './render';

// Chef d'orchestre du mini-jeu : relie le moteur (logique), le rendu (dessin) et les gestes du visiteur.
// C'est CE fichier que la page importe à la demande, quand le footer approche (aucun poids avant).
// Il ne bloque jamais le défilement de la page : aucun `preventDefault` sur les gestes, `touch-action: pan-y` côté CSS.

export interface SmashHud {
  status: EngineStatus;
  score: number;
  seconds: number;
}

export interface SmashOptions {
  canvas: HTMLCanvasElement;
  /** Couleurs des catégories de la boutique (les pots les reprennent). */
  accents: readonly (string | null | undefined)[];
  /** Appelé quand le score, la seconde affichée ou l'état changent (pas à chaque image). */
  onChange: (hud: SmashHud) => void;
  random?: () => number;
}

export interface SmashController {
  /** Nouvelle partie : « Jouer », « Recommencer » et « Rejouer » appellent la même chose. */
  start(): void;
  pause(): void;
  resume(): void;
  focus(): void;
  destroy(): void;
}

const MAX_DPR = 2;

export function createSmash({ canvas, accents, onChange, random = Math.random }: SmashOptions): SmashController {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Navigateur sans canvas 2D : le jeu ne peut pas démarrer, la page reste intacte.
    return { start() {}, pause() {}, resume() {}, focus() {}, destroy() {} };
  }
  const palettes = buildPalettes(accents);
  const makeCanvas = (width: number, height: number) => {
    const sprite = document.createElement('canvas');
    sprite.width = width;
    sprite.height = height;
    return sprite;
  };
  const font = getComputedStyle(canvas).fontFamily || 'system-ui, sans-serif';
  const rect = canvas.getBoundingClientRect();
  const engine = new SmashEngine({ width: rect.width || 640, height: rect.height || 400, paletteCount: palettes.length, random });
  const effects = new Effects(random);
  const renderer = new SmashRenderer(ctx, palettes, makeCanvas, font);

  let frame = 0;
  let lastTime = 0;
  let lastHud: SmashHud | null = null;
  let destroyed = false;
  let pointer: { id: number; x: number; y: number } | null = null;

  const emit = () => {
    const hud: SmashHud = { status: engine.status, score: engine.score, seconds: secondsLeft(engine.timeLeftMs) };
    if (lastHud && lastHud.status === hud.status && lastHud.score === hud.score && lastHud.seconds === hud.seconds) return;
    lastHud = hud;
    onChange(hud);
  };

  const burst = (events: readonly SmashEvent[]) => {
    for (const event of events) effects.burst(event, POT_MATERIAL[event.kind]);
    if (events.length > 0) emit();
  };

  const resizeCanvas = () => {
    const box = canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    engine.resize(box.width, box.height);
    renderer.resize(box.width, box.height, dpr);
    renderer.draw(engine, effects);
  };

  const tick = (time: number) => {
    frame = 0;
    if (destroyed) return;
    const dt = lastTime === 0 ? 16 : time - lastTime;
    lastTime = time;
    engine.step(dt);
    effects.update(dt, engine.height);
    renderer.draw(engine, effects);
    emit();
    const animating = engine.status === 'running' || engine.pots.length > 0 || effects.active;
    if (animating && engine.status !== 'paused') frame = requestAnimationFrame(tick);
    else lastTime = 0;
  };

  const ensureLoop = () => {
    if (!frame && !destroyed) {
      lastTime = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  const pause = () => {
    if (engine.status !== 'running') return;
    engine.pause();
    emit();
  };

  // Gestes : un toucher casse un pot, un balayage en casse plusieurs. Le doigt a une marge plus généreuse que la souris.
  const position = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  const padFor = (event: PointerEvent) => (event.pointerType === 'mouse' ? 0 : SMASH.touchPad);
  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const { x, y } = position(event);
    pointer = { id: event.pointerId, x, y };
    burst(engine.slash(x, y, x, y, padFor(event)));
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* pas bloquant */
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const { x, y } = position(event);
    burst(engine.slash(pointer.x, pointer.y, x, y, padFor(event)));
    pointer = { id: event.pointerId, x, y };
  };
  const onPointerEnd = (event: PointerEvent) => {
    if (pointer?.id === event.pointerId) pointer = null;
  };
  // Clavier : Espace ou Entrée casse le pot le plus bas. On ne retient la touche que pendant la partie : le reste du temps, Espace défile la page.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    if (engine.status !== 'running') return;
    event.preventDefault();
    if (!event.repeat) burst(engine.smashLowest());
  };

  const onVisibility = () => {
    if (document.hidden) pause();
  };
  // Hors de l'écran (le visiteur a fait défiler la page) : pause automatique, sans reprise surprise.
  const watcher =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(
          (entries) => {
            for (const entry of entries) if (!entry.isIntersecting) pause();
          },
          { threshold: 0.25 },
        );
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotion = () => {
    if (motion.matches) pause();
  };
  const resizer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resizeCanvas);

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);
  canvas.addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', onMotion);
  watcher?.observe(canvas);
  resizer?.observe(canvas);
  resizeCanvas();

  return {
    start() {
      if (motion.matches) return; // moins d'animations demandé : le jeu ne se lance pas
      renderer.warmUp();
      effects.clear();
      engine.start();
      emit();
      ensureLoop();
    },
    pause,
    resume() {
      if (engine.status !== 'paused' || motion.matches) return;
      engine.resume();
      emit();
      ensureLoop();
    },
    focus() {
      canvas.focus({ preventScroll: true });
    },
    destroy() {
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerEnd);
      canvas.removeEventListener('pointercancel', onPointerEnd);
      canvas.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
      watcher?.disconnect();
      resizer?.disconnect();
    },
  };
}
