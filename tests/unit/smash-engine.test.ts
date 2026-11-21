import { describe, expect, it } from 'vitest';
import { POT_KINDS, SMASH, SmashEngine, distanceToSegment, mulberry32, secondsLeft, unitForWidth, type Pot } from '@/lib/smash/engine';

const make = (overrides: Partial<ConstructorParameters<typeof SmashEngine>[0]> = {}) =>
  new SmashEngine({ width: 640, height: 400, paletteCount: 3, random: mulberry32(7), ...overrides });

/** Avance de `ms` millisecondes en pas de 16 ms (comme un écran à 60 images par seconde). */
const run = (engine: SmashEngine, ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += 16) engine.step(16);
};

const pot = (overrides: Partial<Pot> = {}): Pot => ({ id: 99, kind: 'jar', size: 'large', paletteIndex: 0, x: 300, y: 200, vx: 0, vy: 0, angle: 0, spin: 0, radius: 46, ...overrides });

describe('partie : durée, pause, fin', () => {
  it('une partie dure 30 secondes puis se termine, sans score négatif', () => {
    const engine = make();
    expect(engine.status).toBe('ready');
    engine.start();
    expect(engine.status).toBe('running');
    expect(secondsLeft(engine.timeLeftMs)).toBe(30);
    run(engine, 29_000);
    expect(engine.status).toBe('running');
    expect(secondsLeft(engine.timeLeftMs)).toBeLessThanOrEqual(1);
    run(engine, 2_000);
    expect(engine.status).toBe('over');
    expect(engine.timeLeftMs).toBe(0);
    expect(engine.score).toBeGreaterThanOrEqual(0);
  });

  it('le chronomètre ne démarre pas avant « Jouer » : le moteur prêt n’avance pas', () => {
    const engine = make();
    run(engine, 5_000);
    expect(engine.timeLeftMs).toBe(SMASH.durationMs);
    expect(engine.pots).toHaveLength(0);
  });

  it('la pause fige le temps, les pots et le toucher ; la reprise repart de là', () => {
    const engine = make();
    engine.start();
    run(engine, 2_000);
    engine.pause();
    expect(engine.status).toBe('paused');
    const frozen = { time: engine.timeLeftMs, pots: engine.pots.map((p) => ({ ...p })) };
    run(engine, 5_000);
    expect(engine.timeLeftMs).toBe(frozen.time);
    expect(engine.pots).toEqual(frozen.pots);
    const first = engine.pots[0];
    if (first) expect(engine.slash(first.x, first.y, first.x, first.y)).toEqual([]);
    engine.resume();
    expect(engine.status).toBe('running');
    run(engine, 1_000);
    expect(engine.timeLeftMs).toBeLessThan(frozen.time);
  });

  it('pause et reprise sont sans effet hors partie', () => {
    const engine = make();
    engine.pause();
    expect(engine.status).toBe('ready');
    engine.resume();
    expect(engine.status).toBe('ready');
  });

  it('« Recommencer » remet score, temps et terrain à zéro', () => {
    const engine = make();
    engine.start();
    run(engine, 3_000);
    engine.pots.push(pot());
    engine.slash(300, 200, 300, 200);
    expect(engine.score).toBeGreaterThan(0);
    engine.start();
    expect(engine.score).toBe(0);
    expect(engine.pots).toHaveLength(0);
    expect(engine.timeLeftMs).toBe(SMASH.durationMs);
    expect(engine.status).toBe('running');
  });

  it('après la fin, plus aucun pot n’apparaît, plus aucun point ne se gagne, les pots en l’air retombent', () => {
    const engine = make();
    engine.start();
    run(engine, 31_000);
    expect(engine.status).toBe('over');
    engine.pots.push(pot({ vy: -50 }));
    const score = engine.score;
    expect(engine.slash(300, 200, 300, 200)).toEqual([]);
    expect(engine.smashLowest()).toEqual([]);
    run(engine, 6_000);
    expect(engine.score).toBe(score);
    expect(engine.pots).toHaveLength(0);
  });

  it('un très long pas de temps (onglet en arrière-plan) est ramené à 50 ms', () => {
    const engine = make();
    engine.start();
    engine.step(60_000);
    expect(engine.timeLeftMs).toBe(SMASH.durationMs - SMASH.maxStepMs);
    expect(engine.status).toBe('running');
  });
});

describe('pots : apparition et mouvement', () => {
  it('un premier pot apparaît presque tout de suite, lancé depuis le bas', () => {
    const engine = make();
    engine.start();
    run(engine, 400);
    expect(engine.pots.length).toBeGreaterThanOrEqual(1);
    const first = engine.pots[0]!;
    expect(first.x).toBeGreaterThan(0);
    expect(first.x).toBeLessThan(640);
  });

  it('un pot monte, atteint son sommet dans le terrain, puis retombe et disparaît', () => {
    const engine = make();
    engine.start();
    run(engine, 300);
    const tracked = engine.pots[0]!;
    const id = tracked.id;
    let top = tracked.y;
    let sawRise = false;
    let gone = false;
    for (let i = 0; i < 400; i += 1) {
      engine.step(16);
      const current = engine.pots.find((other) => other.id === id);
      if (!current) {
        gone = true;
        break;
      }
      if (current.vy < 0) sawRise = true;
      top = Math.min(top, current.y);
    }
    expect(sawRise).toBe(true);
    expect(top).toBeLessThan(400 * 0.55);
    expect(top).toBeGreaterThan(0);
    expect(gone).toBe(true);
  });

  it('jamais plus de 8 pots en même temps', () => {
    const engine = make({ random: mulberry32(3) });
    engine.start();
    let most = 0;
    for (let i = 0; i < 30_000 / 16; i += 1) {
      engine.step(16);
      most = Math.max(most, engine.pots.length);
    }
    expect(most).toBeLessThanOrEqual(SMASH.maxPots);
    expect(most).toBeGreaterThan(2);
  });

  it('le rythme s’accélère : plus de pots lancés dans les 10 dernières secondes que dans les 10 premières', () => {
    const engine = make({ random: mulberry32(11) });
    engine.start();
    const seen = new Set<number>();
    const bucket = { start: 0, end: 0 };
    for (let elapsed = 0; elapsed < 30_000; elapsed += 16) {
      engine.step(16);
      for (const current of engine.pots) {
        if (seen.has(current.id)) continue;
        seen.add(current.id);
        if (elapsed < 10_000) bucket.start += 1;
        if (elapsed >= 20_000) bucket.end += 1;
      }
    }
    expect(bucket.end).toBeGreaterThan(bucket.start);
  });

  it('les trois tailles, les cinq contenants et les palettes sont tous utilisés', () => {
    const engine = make({ random: mulberry32(5) });
    engine.start();
    const sizes = new Set<string>();
    const kinds = new Set<string>();
    const palettes = new Set<number>();
    for (let i = 0; i < 30_000 / 16; i += 1) {
      engine.step(16);
      for (const current of engine.pots) {
        sizes.add(current.size);
        kinds.add(current.kind);
        palettes.add(current.paletteIndex);
      }
    }
    expect([...sizes].sort()).toEqual(['large', 'medium', 'small']);
    expect([...kinds].sort()).toEqual([...POT_KINDS].sort());
    expect([...palettes].sort()).toEqual([0, 1, 2]);
  });

  it('même graine, même partie ; graine différente, partie différente', () => {
    const snapshot = (seed: number) => {
      const engine = make({ random: mulberry32(seed) });
      engine.start();
      run(engine, 5_000);
      return JSON.stringify(engine.pots);
    };
    expect(snapshot(21)).toBe(snapshot(21));
    expect(snapshot(21)).not.toBe(snapshot(22));
  });
});

describe('toucher, balayage, clavier', () => {
  const started = () => {
    const engine = make();
    engine.start();
    return engine;
  };

  it('chaque taille rapporte ses points : les plus petits pots rapportent le plus', () => {
    expect(SMASH.sizes.small.points).toBeGreaterThan(SMASH.sizes.medium.points);
    expect(SMASH.sizes.medium.points).toBeGreaterThan(SMASH.sizes.large.points);
    const engine = started();
    engine.pots.push(pot({ id: 1, size: 'small', x: 100 }), pot({ id: 2, size: 'medium', x: 300 }), pot({ id: 3, size: 'large', x: 500 }));
    expect(engine.slash(100, 200, 100, 200)[0]?.points).toBe(30);
    expect(engine.slash(300, 200, 300, 200)[0]?.points).toBe(20);
    expect(engine.slash(500, 200, 500, 200)[0]?.points).toBe(10);
    expect(engine.score).toBe(60);
  });

  it('un toucher dans le pot le casse ; à côté, rien', () => {
    const engine = started();
    engine.pots.push(pot({ radius: 40 }));
    expect(engine.slash(300 + 90, 200, 300 + 90, 200)).toEqual([]);
    expect(engine.pots).toHaveLength(1);
    const events = engine.slash(300 + 30, 200, 300 + 30, 200);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ potId: 99, kind: 'jar', size: 'large', x: 300, y: 200 });
    expect(engine.pots).toHaveLength(0);
  });

  it('un pot ne rapporte qu’une fois', () => {
    const engine = started();
    engine.pots.push(pot());
    engine.slash(300, 200, 300, 200);
    const score = engine.score;
    expect(engine.slash(300, 200, 300, 200)).toEqual([]);
    expect(engine.score).toBe(score);
  });

  it('le doigt est plus généreux que la souris : la marge de toucher agrandit la zone', () => {
    const engine = started();
    engine.pots.push(pot({ radius: 30 }));
    const miss = 30 * 1.15 + 6;
    expect(engine.slash(300 + miss, 200, 300 + miss, 200)).toEqual([]);
    expect(engine.slash(300 + miss, 200, 300 + miss, 200, SMASH.touchPad)).toHaveLength(1);
  });

  it('un toucher entre deux pots superposés casse le plus proche, un seul', () => {
    const engine = started();
    engine.pots.push(pot({ id: 1, x: 300 }), pot({ id: 2, x: 330 }));
    const events = engine.slash(325, 200, 325, 200);
    expect(events.map((event) => event.potId)).toEqual([2]);
    expect(engine.pots.map((other) => other.id)).toEqual([1]);
  });

  it('un balayage casse tous les pots qu’il traverse, et seulement ceux-là', () => {
    const engine = started();
    engine.pots.push(pot({ id: 1, x: 100 }), pot({ id: 2, x: 300 }), pot({ id: 3, x: 500 }), pot({ id: 4, x: 300, y: 380 }));
    const events = engine.slash(60, 200, 560, 200);
    expect(events.map((event) => event.potId).sort()).toEqual([1, 2, 3]);
    expect(engine.pots.map((other) => other.id)).toEqual([4]);
  });

  it('un pot qui sort de l’écran ne peut plus être touché', () => {
    const engine = started();
    engine.pots.push(pot({ y: 400 + 60 }));
    expect(engine.slash(300, 460, 300, 460)).toEqual([]);
  });

  it('clavier : Espace casse le pot visible le plus bas, en priorité celui qui retombe', () => {
    const engine = started();
    engine.pots.push(pot({ id: 1, y: 300, vy: -100 }), pot({ id: 2, y: 120, vy: 80 }), pot({ id: 3, y: 380, vy: -10 }));
    expect(engine.smashLowest()[0]?.potId).toBe(2); // seul pot qui retombe
    expect(engine.smashLowest()[0]?.potId).toBe(3); // puis le plus bas
    expect(engine.smashLowest()[0]?.potId).toBe(1);
    expect(engine.smashLowest()).toEqual([]);
  });

  it('clavier : un pot encore sous l’écran n’est pas cassé', () => {
    const engine = started();
    engine.pots.push(pot({ y: 400 + 60, vy: -300 }));
    expect(engine.smashLowest()).toEqual([]);
  });
});

describe('terrain redimensionné', () => {
  it('les pots restent proportionnellement au même endroit', () => {
    const engine = make();
    engine.start();
    engine.pots.push(pot({ x: 320, y: 200 }));
    engine.resize(320, 400);
    expect(engine.pots[0]).toMatchObject({ x: 160, y: 200 });
    expect(engine.width).toBe(320);
  });

  it('les pots rétrécissent sur un petit écran', () => {
    expect(unitForWidth(360)).toBeLessThan(unitForWidth(900));
    expect(unitForWidth(100)).toBe(0.78);
    expect(unitForWidth(4000)).toBe(1.15);
  });
});

describe('outils', () => {
  it('distanceToSegment : projection sur le segment, bornée aux extrémités', () => {
    expect(distanceToSegment(5, 3, 0, 0, 10, 0)).toBe(3);
    expect(distanceToSegment(-4, 3, 0, 0, 10, 0)).toBe(5);
    expect(distanceToSegment(3, 4, 0, 0, 0, 0)).toBe(5);
  });
  it('secondsLeft arrondit au-dessus : 30 au départ, jamais 0 avant la fin', () => {
    expect(secondsLeft(30_000)).toBe(30);
    expect(secondsLeft(29_001)).toBe(30);
    expect(secondsLeft(1)).toBe(1);
    expect(secondsLeft(0)).toBe(0);
  });
});
