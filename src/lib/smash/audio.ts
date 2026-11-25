import type { Material } from './effects';

// Bruitages de Cosmetic Smash, SYNTHÉTISÉS (aucun fichier son à télécharger) avec l'API Web Audio.
// Deux étages : des fonctions PURES qui décrivent chaque bruit comme une liste de « voix » (testées sans navigateur),
// puis un lecteur qui les joue. Le son ne démarre qu'après un geste du visiteur (« Jouer », toucher du plateau) :
// les navigateurs l'exigent, et rien ne sonne tout seul. Il peut être coupé à tout moment ; aucune préférence n'est mémorisée.

export type Voice =
  | { kind: 'noise'; at: number; duration: number; gain: number; filter: 'bandpass' | 'lowpass' | 'highpass'; from: number; to: number; q: number }
  | { kind: 'tone'; at: number; duration: number; gain: number; wave: 'sine' | 'triangle' | 'square'; from: number; to: number };

type Random = () => number;
const between = (random: Random, min: number, max: number) => min + (max - min) * random();

/** Pas de gamme pour une série de coupes enchaînées : chaque pot du même geste monte d'un demi-ton (au plus une octave). */
export const comboRatio = (combo: number): number => 2 ** (Math.min(Math.max(combo, 0), 12) / 12);

/** « Frrt » : l'air fendu par le geste. Plus le geste est rapide, plus il est fort et aigu. `speed` : pixels par milliseconde. */
export function planSwish(speed: number, random: Random): Voice[] {
  const energy = Math.min(1, Math.max(0, speed / 2.2));
  if (energy < 0.12) return [];
  const start = between(random, 1500, 2300) * (0.8 + 0.5 * energy);
  return [{ kind: 'noise', at: 0, duration: 0.09 + 0.05 * energy, gain: 0.05 + 0.1 * energy, filter: 'bandpass', from: start, to: start * 2.6, q: 1.1 }];
}

export interface CutSound {
  material: Material;
  /** Rang du pot dans le geste en cours (0 pour le premier) : la hauteur monte. */
  combo: number;
  /** Petit = aigu, gros = grave (rayon en pixels). */
  radius: number;
}

/**
 * La coupe d'un pot : un « shing » de lame, un « splotch » de crème, puis le contenant — du verre qui tinte ou un
 * plastique qui claque. Les tirages au sort varient chaque coupe (jamais deux fois exactement le même son).
 */
export function planCut({ material, combo, radius }: CutSound, random: Random): Voice[] {
  const pitch = comboRatio(combo) * between(random, 0.94, 1.06) * (36 / Math.max(20, radius)) ** 0.35;
  const voices: Voice[] = [
    // la lame
    { kind: 'noise', at: 0, duration: 0.07, gain: 0.2, filter: 'highpass', from: 3200 * pitch, to: 6500 * pitch, q: 0.7 },
    { kind: 'tone', at: 0, duration: 0.09, gain: 0.07, wave: 'sine', from: 2400 * pitch, to: 1300 * pitch },
    // la crème
    { kind: 'noise', at: 0.015, duration: 0.2, gain: 0.3, filter: 'lowpass', from: 1100 * pitch, to: 240, q: 0.8 },
    { kind: 'tone', at: 0.01, duration: 0.16, gain: 0.32, wave: 'sine', from: 210 * pitch, to: 68 },
  ];
  if (material === 'glass') {
    const pings = 4 + Math.floor(random() * 4);
    for (let index = 0; index < pings; index += 1) {
      const frequency = between(random, 2300, 6400) * pitch;
      voices.push({ kind: 'tone', at: 0.012 + random() * 0.17, duration: between(random, 0.12, 0.32), gain: between(random, 0.035, 0.085), wave: random() < 0.7 ? 'sine' : 'triangle', from: frequency, to: frequency * 0.985 });
    }
  } else {
    voices.push(
      { kind: 'tone', at: 0, duration: 0.1, gain: 0.2, wave: 'triangle', from: 330 * pitch, to: 150 },
      { kind: 'noise', at: 0.005, duration: 0.05, gain: 0.1, filter: 'highpass', from: 1800, to: 900, q: 0.6 },
    );
  }
  // Petite note de récompense à partir de la deuxième coupe du geste.
  if (combo >= 1) voices.push({ kind: 'tone', at: 0.05, duration: 0.15, gain: 0.06, wave: 'sine', from: 880 * comboRatio(combo), to: 880 * comboRatio(combo) });
  return voices;
}

const NOTE = (semitones: number, base = 523.25) => base * 2 ** (semitones / 12);

/** Départ : trois notes qui montent. */
export function planStart(): Voice[] {
  return [0, 4, 7].map((semitones, index) => ({ kind: 'tone', at: index * 0.085, duration: 0.2, gain: 0.09, wave: 'triangle', from: NOTE(semitones), to: NOTE(semitones) }) as Voice);
}

/** Fin de partie : un petit accord qui se pose. */
export function planEnd(): Voice[] {
  return [7, 4, 0, -5].map((semitones, index) => ({ kind: 'tone', at: index * 0.11, duration: 0.34, gain: 0.085, wave: 'triangle', from: NOTE(semitones), to: NOTE(semitones) }) as Voice);
}

// ---------------------------------------------------------------------------
// Lecteur Web Audio
// ---------------------------------------------------------------------------

type AudioContextFactory = () => AudioContext | null;

const defaultFactory: AudioContextFactory = () => {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
};

export class SmashAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;
  private lastSwish = -Infinity;

  constructor(
    private readonly random: Random = Math.random,
    private readonly factory: AudioContextFactory = defaultFactory,
  ) {}

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.context) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.context.currentTime, 0.015);
  }

  /** À appeler depuis un geste du visiteur (clic sur « Jouer », toucher du plateau). Sans effet si le son est indisponible. */
  unlock(): void {
    try {
      if (!this.context) {
        const context = this.factory();
        if (!context) return;
        this.context = context;
        // Un compresseur évite la saturation quand plusieurs pots éclatent en même temps.
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -14;
        compressor.ratio.value = 6;
        this.master = context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.8;
        this.master.connect(compressor);
        compressor.connect(context.destination);
        const length = Math.floor(context.sampleRate * 0.6);
        this.noise = context.createBuffer(1, length, context.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let index = 0; index < length; index += 1) data[index] = this.random() * 2 - 1;
      }
      if (this.context.state === 'suspended') void this.context.resume();
    } catch {
      this.context = null;
    }
  }

  /** Le geste fend l'air. `now` en ms ; au plus un « frrt » toutes les 110 ms. */
  swish(speed: number, now: number): void {
    if (now - this.lastSwish < 110) return;
    const voices = planSwish(speed, this.random);
    if (voices.length === 0) return;
    this.lastSwish = now;
    this.play(voices);
  }

  cut(sound: CutSound): void {
    this.play(planCut(sound, this.random));
  }

  start(): void {
    this.play(planStart());
  }

  end(): void {
    this.play(planEnd());
  }

  destroy(): void {
    const context = this.context;
    this.context = null;
    this.master = null;
    this.noise = null;
    if (context) void context.close().catch(() => undefined);
  }

  private play(voices: readonly Voice[]): void {
    const { context, master } = this;
    if (!context || !master || this.muted || context.state !== 'running') return;
    const base = context.currentTime + 0.005;
    for (const voice of voices) {
      try {
        const begin = base + voice.at;
        const end = begin + voice.duration;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, begin);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, voice.gain), begin + Math.min(0.006, voice.duration / 3));
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        gain.connect(master);
        if (voice.kind === 'tone') {
          const oscillator = context.createOscillator();
          oscillator.type = voice.wave;
          oscillator.frequency.setValueAtTime(voice.from, begin);
          if (voice.to !== voice.from) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, voice.to), end);
          oscillator.connect(gain);
          oscillator.start(begin);
          oscillator.stop(end + 0.02);
        } else if (this.noise) {
          const source = context.createBufferSource();
          source.buffer = this.noise;
          const filter = context.createBiquadFilter();
          filter.type = voice.filter;
          filter.Q.value = voice.q;
          filter.frequency.setValueAtTime(voice.from, begin);
          filter.frequency.exponentialRampToValueAtTime(Math.max(40, voice.to), end);
          source.connect(filter);
          filter.connect(gain);
          source.start(begin, this.random() * 0.2);
          source.stop(end + 0.02);
        }
      } catch {
        /* une voix qui échoue ne gêne pas les autres */
      }
    }
  }
}
