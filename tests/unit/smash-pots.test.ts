import { describe, expect, it } from 'vitest';
import { POT_KINDS } from '@/lib/smash/engine';
import { buildPalettes } from '@/lib/smash/palette';
import { DESIGN, POT_MATERIAL, createPotSprite, drawPotShape, type Ctx } from '@/lib/smash/pots';

// Faux contexte 2D : il note les appels. On vérifie que chaque contenant se dessine, que l'état du contexte est rendu
// intact (save/restore équilibrés) et qu'il est construit avec de vrais dégradés (volumes, reflets), pas en aplats.
function recorder() {
  const calls: Record<string, number> = {};
  const state: Record<string, unknown> = { canvas: { width: 260, height: 312 } };
  const ctx = new Proxy(state, {
    get(target, property: string) {
      if (property in target) return target[property];
      return (...args: unknown[]) => {
        calls[property] = (calls[property] ?? 0) + 1;
        if (property === 'createLinearGradient' || property === 'createRadialGradient') return { addColorStop: () => undefined };
        void args;
        return undefined;
      };
    },
    set(target, property: string, value) {
      target[property] = value;
      return true;
    },
  }) as unknown as Ctx;
  return { ctx, calls };
}

const palettes = buildPalettes(['#f4a6c0', '#f2c94c', '#b69bd6', '#b7d36b']);

describe('dessin des pots', () => {
  for (const kind of POT_KINDS) {
    it(`${kind} : se dessine avec des dégradés, des reflets et un contexte rendu intact`, () => {
      for (const [index, palette] of palettes.entries()) {
        const { ctx, calls } = recorder();
        drawPotShape(ctx, kind, palette, index);
        expect(calls.save).toBe(calls.restore);
        expect((calls.createLinearGradient ?? 0) + (calls.createRadialGradient ?? 0)).toBeGreaterThanOrEqual(10);
        expect((calls.fill ?? 0) + (calls.fillRect ?? 0)).toBeGreaterThanOrEqual(8);
        expect(calls.clip).toBeGreaterThanOrEqual(1);
      }
    });
  }

  it('les cinq contenants demandés existent : pot de crème, flacon pompe, compte-gouttes, tube, bouteille', () => {
    expect([...POT_KINDS].sort()).toEqual(['bottle', 'dropper', 'jar', 'pump', 'tube']);
  });

  it('verre ou plastique : un matériau pour chaque contenant', () => {
    expect(POT_MATERIAL).toEqual({ jar: 'glass', pump: 'plastic', dropper: 'glass', tube: 'plastic', bottle: 'glass' });
  });

  it('une image pré-dessinée par pot, à la taille de la boîte de dessin', () => {
    const { ctx } = recorder();
    const made: Array<{ width: number; height: number }> = [];
    const sprite = createPotSprite('jar', palettes[0]!, 0, 2.6, (width, height) => {
      const canvas = { width, height, getContext: () => ctx } as unknown as HTMLCanvasElement;
      made.push({ width, height });
      return canvas;
    });
    expect(made).toEqual([{ width: Math.ceil(DESIGN.width * 2.6), height: Math.ceil(DESIGN.height * 2.6) }]);
    expect(sprite.scale).toBe(2.6);
  });
});
