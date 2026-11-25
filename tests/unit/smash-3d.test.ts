import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SmashAudio, comboRatio, planCut, planEnd, planStart, planSwish, type Voice } from '@/lib/smash/audio';
import { GlbError, computeNormals, multiply, parseGlb } from '@/lib/smash/glb';
import { hslToRgb, POT_MODEL_FILES, TINT_CONFIG } from '@/lib/smash/gl3d';
import { chain, identity, pixelProjection, rotationPart, rotationY, translation } from '@/lib/smash/mat4';
import { CUT, MAX_YAW, POT_SPAN, cutCoreScale, cutFlashAlpha, cutHalfOpacity, cutHalfSpread, cutHalfYaw, easeOutBack, potPose, potYaw } from '@/lib/smash/pose';
import { SlashTrail } from '@/lib/smash/trail';
import { POT_KINDS } from '@/lib/smash/engine';

const ASSETS = path.resolve(__dirname, '../../public/assets/smash');
const load = (file: string) => {
  const buffer = readFileSync(path.join(ASSETS, file));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

describe('lecteur GLB', () => {
  it('lit les dix fichiers livrés avec le jeu (entier + découpé pour chaque contenant)', () => {
    const files = readdirSync(ASSETS).filter((file) => file.endsWith('.glb'));
    expect(files).toHaveLength(10);
    for (const kind of POT_KINDS) {
      const base = POT_MODEL_FILES[kind];
      const whole = parseGlb(load(`${base}.glb`));
      const cut = parseGlb(load(`${base}-cut.glb`));
      expect(whole.nodes.length).toBeGreaterThan(0);
      // Les contenants sont « Y vers le haut » : la hauteur est l'axe le plus long de chaque pot.
      const size = whole.bounds.max.map((value, index) => value - (whole.bounds.min[index] as number));
      expect(size[1]).toBeGreaterThan(size[0] as number * 0.5);
      // Une découpe = au moins deux moitiés + le disque de crème.
      expect(cut.nodes.some((node) => node.name.endsWith('cream_core'))).toBe(true);
      expect(cut.nodes.filter((node) => !node.name.endsWith('cream_core')).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('les moitiés découpées ont retrouvé leurs couleurs (matériaux de la version entière)', () => {
    for (const kind of ['bottle', 'dropper', 'tube'] as const) {
      const cut = parseGlb(load(`${POT_MODEL_FILES[kind]}-cut.glb`));
      expect(cut.materials.length).toBeGreaterThan(2);
      const used = new Set(cut.nodes.flatMap((node) => node.primitives.map((primitive) => primitive.material)));
      expect(used.has(-1)).toBe(false);
    }
  });

  it('les contenants texturés pèsent peu : une seule texture de couleur en JPEG', () => {
    for (const file of ['jar.glb', 'jar-cut.glb', 'pump.glb', 'pump-cut.glb']) {
      const model = parseGlb(load(file));
      expect(model.images).toHaveLength(1);
      expect(model.images[0]?.mimeType).toBe('image/jpeg');
      expect(model.images[0]?.bytes.length).toBeLessThan(120_000);
    }
    expect(readdirSync(ASSETS).reduce((sum, file) => sum + readFileSync(path.join(ASSETS, file)).length, 0)).toBeLessThan(2_000_000);
  });

  it('refuse un fichier qui n’est pas un GLB', () => {
    expect(() => parseGlb(new ArrayBuffer(8))).toThrow(GlbError);
    expect(() => parseGlb(new TextEncoder().encode('ceci n’est pas un glb du tout !!').buffer as ArrayBuffer)).toThrow(GlbError);
  });

  it('calcule des normales unitaires quand le fichier n’en a pas', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const normals = computeNormals(positions, [0, 1, 2]);
    expect(Array.from(normals)).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  });
});

describe('matrices', () => {
  it('compose de gauche à droite et laisse l’identité neutre', () => {
    const moved = chain(translation(10, 0, 0), rotationY(0));
    expect(moved[12]).toBe(10);
    expect(Array.from(multiply(identity(), moved))).toEqual(Array.from(moved));
  });

  it('la projection fait coïncider le monde (Y vers le haut) avec les pixels du canvas', () => {
    const projection = pixelProjection(400, 200, 1000);
    const toClip = (x: number, y: number) => [(projection[0] as number) * x + (projection[12] as number), (projection[5] as number) * y + (projection[13] as number)];
    expect(toClip(0, 0)).toEqual([-1, 1]); // haut gauche du canvas
    expect(toClip(400, -200)[0]).toBeCloseTo(1, 5); // bas droite
    expect(toClip(400, -200)[1]).toBeCloseTo(-1, 5);
    expect(projection[15]).toBe(1);
  });

  it('extrait la rotation sans l’échelle ni la translation', () => {
    const matrix = chain(translation(5, 5, 5), rotationY(Math.PI / 2));
    const rotation = rotationPart(matrix);
    expect(rotation[2]).toBeCloseTo(-1, 5);
    expect(rotation[6]).toBeCloseTo(1, 5);
  });

  it('convertit HSL en RVB', () => {
    expect(hslToRgb(0, 100, 50).map((value) => Math.round(value * 100))).toEqual([100, 0, 0]);
    expect(hslToRgb(200, 0, 100).map((value) => Math.round(value * 100))).toEqual([100, 100, 100]);
  });

  it('chaque contenant du jeu a son fichier et sa règle de teinte', () => {
    for (const kind of POT_KINDS) {
      expect(POT_MODEL_FILES[kind]).toBeTruthy();
      expect(TINT_CONFIG[kind].amount).toBeGreaterThan(0);
      expect(TINT_CONFIG[kind].amount).toBeLessThanOrEqual(1);
    }
  });
});

describe('attitude des pots et animation de coupe', () => {
  it('un pot ne tourne jamais de plus que MAX_YAW : on ne le voit jamais de dos', () => {
    for (let id = 0; id < 40; id += 1) {
      for (let angle = -20; angle <= 20; angle += 0.37) expect(Math.abs(potYaw(id, angle))).toBeLessThanOrEqual(MAX_YAW + 1e-9);
    }
  });

  it('la taille d’un pot suit son rayon', () => {
    expect(potPose({ id: 1, x: 10, y: 20, angle: 0.3, radius: 30 })).toMatchObject({ x: 10, y: 20, size: 30 * POT_SPAN, roll: 0.3 });
  });

  it('les moitiés pivotent en sens contraires jusqu’à présenter leur face de coupe', () => {
    expect(cutHalfYaw('right', 0, 0)).toBeCloseTo(0, 5);
    expect(cutHalfYaw('right', 0, CUT.swingMs)).toBeCloseTo(CUT.swingYaw, 5);
    expect(cutHalfYaw('left', 0, CUT.swingMs)).toBeCloseTo(-CUT.swingYaw, 5);
    // Quelle que soit la rotation de départ, la moitié arrive à la même position finale.
    expect(cutHalfYaw('right', 0.6, CUT.swingMs * 5)).toBeCloseTo(CUT.swingYaw, 5);
  });

  it('l’écartement croît, l’opacité fond sur la fin, le disque de crème apparaît puis disparaît', () => {
    expect(cutHalfSpread(0)).toBe(0);
    expect(cutHalfSpread(CUT.totalMs)).toBeCloseTo(CUT.spread, 2);
    expect(cutHalfOpacity(0, CUT.totalMs)).toBe(1);
    expect(cutHalfOpacity(CUT.totalMs, CUT.totalMs)).toBe(0);
    expect(cutCoreScale(0)).toBeCloseTo(0, 5);
    expect(cutCoreScale(CUT.coreInMs)).toBeCloseTo(1, 1);
    expect(cutCoreScale((CUT.coreInMs + CUT.coreHoldMs) / 2)).toBe(1);
    expect(cutCoreScale(CUT.coreOutMs + 1)).toBe(0);
    expect(cutFlashAlpha(0)).toBe(1);
    expect(cutFlashAlpha(CUT.flashMs)).toBe(0);
    expect(easeOutBack(1)).toBeCloseTo(1, 5);
    expect(easeOutBack(0.5)).toBeGreaterThan(0.5);
  });
});

describe('traînée de coupe', () => {
  it('relie les points d’un même geste, jamais deux gestes entre eux', () => {
    const trail = new SlashTrail();
    trail.begin(0, 0, 0);
    trail.add(10, 0, 10);
    trail.add(20, 0, 20);
    trail.begin(100, 100, 30);
    trail.add(110, 100, 40);
    expect(trail.segments(40)).toHaveLength(3);
  });

  it('plus un point est ancien, plus il est fin et transparent, et la traînée s’éteint seule', () => {
    const trail = new SlashTrail({ lifeMs: 200 });
    trail.begin(0, 0, 0);
    trail.add(10, 0, 100);
    trail.add(20, 0, 200);
    const [older, newer] = trail.segments(200);
    expect((older?.alpha ?? 1) < (newer?.alpha ?? 0)).toBe(true);
    expect((older?.width ?? 99) < (newer?.width ?? 0)).toBe(true);
    expect(trail.isActive(200)).toBe(true);
    trail.prune(1000);
    expect(trail.isActive(1000)).toBe(false);
    expect(trail.points).toHaveLength(0);
  });

  it('ignore les points trop proches et plafonne le nombre de points', () => {
    const trail = new SlashTrail({ maxPoints: 5, minDistance: 3 });
    trail.begin(0, 0, 0);
    trail.add(1, 0, 1);
    expect(trail.points).toHaveLength(1);
    for (let index = 1; index < 20; index += 1) trail.add(index * 10, 0, index);
    expect(trail.points).toHaveLength(5);
    trail.clear();
    expect(trail.points).toHaveLength(0);
  });
});

describe('bruitages', () => {
  const seeded = () => {
    let state = 7;
    return () => {
      state = (state * 16807) % 2147483647;
      return state / 2147483647;
    };
  };
  const valid = (voices: readonly Voice[]) => voices.every((voice) => voice.duration > 0 && voice.duration < 1 && voice.gain > 0 && voice.gain <= 0.4 && voice.at >= 0 && voice.from > 0 && voice.to > 0);

  it('un geste lent est silencieux, un geste vif fend l’air', () => {
    expect(planSwish(0.05, seeded())).toEqual([]);
    const fast = planSwish(2, seeded());
    expect(fast.length).toBeGreaterThan(0);
    expect(valid(fast)).toBe(true);
    expect((planSwish(2, seeded())[0]?.gain ?? 0) > (planSwish(0.5, seeded())[0]?.gain ?? 0)).toBe(true);
  });

  it('le verre tinte, le plastique claque : deux bruits différents, tous deux bornés', () => {
    const glass = planCut({ material: 'glass', combo: 0, radius: 36 }, seeded());
    const plastic = planCut({ material: 'plastic', combo: 0, radius: 36 }, seeded());
    expect(valid(glass) && valid(plastic)).toBe(true);
    expect(glass.length).toBeGreaterThan(plastic.length);
    expect(glass.filter((voice) => voice.kind === 'tone' && voice.from > 2000).length).toBeGreaterThanOrEqual(4);
    expect(plastic.some((voice) => voice.kind === 'tone' && voice.wave === 'triangle')).toBe(true);
  });

  it('chaque pot du même geste monte d’un demi-ton, au plus d’une octave', () => {
    expect(comboRatio(0)).toBe(1);
    expect(comboRatio(12)).toBeCloseTo(2, 5);
    expect(comboRatio(40)).toBeCloseTo(2, 5);
    const first = planCut({ material: 'plastic', combo: 0, radius: 36 }, () => 0.5);
    const third = planCut({ material: 'plastic', combo: 2, radius: 36 }, () => 0.5);
    expect((third[1] as Extract<Voice, { kind: 'tone' }>).from).toBeGreaterThan((first[1] as Extract<Voice, { kind: 'tone' }>).from);
    expect(third.length).toBeGreaterThan(first.length); // note de récompense à partir de la 2ᵉ coupe
  });

  it('les jingles de départ et de fin sont valides', () => {
    expect(valid(planStart())).toBe(true);
    expect(valid(planEnd())).toBe(true);
  });

  it('sans audio disponible, le lecteur ne plante jamais et reste silencieux', () => {
    const audio = new SmashAudio(Math.random, () => null);
    expect(() => {
      audio.unlock();
      audio.cut({ material: 'glass', combo: 0, radius: 30 });
      audio.swish(2, 0);
      audio.start();
      audio.end();
      audio.setMuted(true);
      audio.destroy();
    }).not.toThrow();
    expect(audio.isMuted).toBe(true);
  });
});
