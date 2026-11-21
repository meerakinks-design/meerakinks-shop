import { describe, expect, it } from 'vitest';
import { Effects } from '@/lib/smash/effects';
import { mulberry32, type SmashEvent } from '@/lib/smash/engine';

const event = (overrides: Partial<SmashEvent> = {}): SmashEvent => ({ potId: 1, kind: 'jar', size: 'medium', paletteIndex: 0, x: 200, y: 150, vx: 0, vy: 0, angle: 0, radius: 36, points: 20, ...overrides });

describe('éclatement : éclats, crème, onde, points', () => {
  it('le verre donne beaucoup d’éclats, le plastique moins', () => {
    const glass = new Effects(mulberry32(1));
    const plastic = new Effects(mulberry32(1));
    glass.burst(event(), 'glass');
    plastic.burst(event(), 'plastic');
    expect(glass.shards.length).toBeGreaterThanOrEqual(12);
    expect(plastic.shards.length).toBeLessThan(glass.shards.length);
    expect(glass.shards.every((shard) => shard.material === 'glass' && shard.points.length >= 3)).toBe(true);
  });

  it('chaque éclatement produit des gouttes de crème, une éclaboussure, une onde et les points gagnés', () => {
    const effects = new Effects(mulberry32(2));
    effects.burst(event({ points: 30 }), 'glass');
    expect(effects.drops.length).toBeGreaterThanOrEqual(11);
    expect(effects.splats).toHaveLength(1);
    expect(effects.splats[0]!.petals.length).toBeGreaterThanOrEqual(9);
    expect(effects.rings).toHaveLength(1);
    expect(effects.popups.map((popup) => popup.text)).toEqual(['+30']);
    expect(effects.active).toBe(true);
  });

  it('un petit pot éclate en plus petit qu’un gros', () => {
    const small = new Effects(mulberry32(3));
    const large = new Effects(mulberry32(3));
    small.burst(event({ radius: 27 }), 'glass');
    large.burst(event({ radius: 46 }), 'glass');
    expect(small.splats[0]!.radius).toBeLessThan(large.splats[0]!.radius);
  });

  it('les éclats retombent (gravité), ralentissent et disparaissent : rien ne reste à l’écran', () => {
    const effects = new Effects(mulberry32(4));
    effects.burst(event(), 'glass');
    const first = effects.shards[0]!;
    const startVy = first.vy;
    effects.update(100, 400);
    expect(first.vy).toBeGreaterThan(startVy);
    for (let elapsed = 0; elapsed < 2_000; elapsed += 16) effects.update(16, 400);
    expect(effects.active).toBe(false);
  });

  it('les points montent pendant qu’ils s’effacent', () => {
    const effects = new Effects(mulberry32(5));
    effects.burst(event(), 'glass');
    const popup = effects.popups[0]!;
    const startY = popup.y;
    effects.update(200, 400);
    expect(popup.y).toBeLessThan(startY);
  });

  it('même graine, mêmes éclats ; clear() vide tout', () => {
    const one = new Effects(mulberry32(9));
    const two = new Effects(mulberry32(9));
    one.burst(event(), 'glass');
    two.burst(event(), 'glass');
    expect(JSON.stringify(one.shards)).toBe(JSON.stringify(two.shards));
    one.clear();
    expect(one.active).toBe(false);
  });

  it('un très long pas de temps ne projette pas les éclats hors du terrain', () => {
    const effects = new Effects(mulberry32(6));
    effects.burst(event(), 'glass');
    const first = effects.shards[0]!;
    const startY = first.y;
    effects.update(60_000, 400);
    expect(Math.abs(first.y - startY)).toBeLessThan(400);
  });
});
