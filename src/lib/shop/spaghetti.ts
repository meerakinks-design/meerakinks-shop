// Effet « spaghetti » (décisions D-18 et D-29) : reprise de l'animation des titres de Rabbit Shop
// (classe `.elastic-title`, GSAP SplitText + `elastic.out(0.75, 0.3)`).
//
// Ici, AUCUNE bibliothèque d'animation : le découpage est fait au rendu serveur (le texte complet est dans le
// HTML, lisible sans JavaScript) et la courbe élastique de GSAP est recalculée à l'identique puis écrite en
// CSS `linear()` (src/styles/spaghetti.css). Un test relit ce fichier CSS et le compare à `elasticLinear()` :
// la courbe ne peut pas dériver sans que le test échoue.

/** Valeurs de Rabbit Shop (lib/useGsapLenis.ts, boucle `.elastic-title`). */
export const SPAGHETTI = {
  /** `elastic.out(0.75, 0.3)` */
  amplitude: 0.75,
  period: 0.3,
  /** Nombre de points de la courbe CSS `linear()`. */
  stops: 64,
  /** Décalage entre deux lettres (Rabbit : `stagger: 0.015`). */
  charStepMs: 15,
  /** Décalage entre deux mots, pour les textes courants. */
  wordStepMs: 20,
  /** Étalement total maximal : un long texte ne met jamais plus de ce temps à finir de démarrer. */
  maxSpreadMs: { chars: 900, words: 600 },
} as const;

export type SpaghettiMode = 'chars' | 'words';

/**
 * `elastic.out(amplitude, period)` de GSAP (EasePack, `_configElastic`) :
 * p1 = max(1, amplitude) · p2 = period / min(1, amplitude) · p3 = p2 / 2π · asin(1 / p1)
 * valeur(p) = p1 · 2^(−10 p) · sin((p − p3) · 2π / p2) + 1, et 1 en p = 1.
 * La valeur dépasse 1 (rebond) puis se stabilise.
 */
export function elasticOut(progress: number, amplitude: number = SPAGHETTI.amplitude, period: number = SPAGHETTI.period): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  const p1 = amplitude >= 1 ? amplitude : 1;
  const p2 = period / (amplitude < 1 ? amplitude : 1);
  const p3 = (p2 / (2 * Math.PI)) * (Math.asin(1 / p1) || 0);
  return p1 * 2 ** (-10 * progress) * Math.sin(((progress - p3) * (2 * Math.PI)) / p2) + 1;
}

/** Courbe CSS `linear(...)` échantillonnée sur `stops` points (4 décimales). */
export function elasticLinear(stops: number = SPAGHETTI.stops): string {
  const points: string[] = [];
  for (let index = 0; index < stops; index += 1) {
    const value = elasticOut(index / (stops - 1));
    points.push(String(Number(value.toFixed(4))));
  }
  return `linear(${points.join(', ')})`;
}

/** Mots d'un texte : séparés par les espaces, jamais coupés (normalisé NFC pour ne pas séparer un accent de sa lettre). */
export function splitWords(text: string): string[] {
  return text.normalize('NFC').split(/\s+/).filter((word) => word.length > 0);
}

/** Lettres d'un mot (points de code entiers : un emoji n'est pas coupé en deux). */
export function splitChars(word: string): string[] {
  return Array.from(word);
}

export interface SpaghettiUnit {
  /** Rang dans le texte : sert au décalage (`--i`). */
  index: number;
  text: string;
}
export interface SpaghettiWord {
  text: string;
  /** Mode « words » : le rang du mot. Mode « chars » : absent (ce sont les lettres qui sont animées). */
  index?: number;
  chars?: SpaghettiUnit[];
}
export interface SpaghettiPlan {
  mode: SpaghettiMode;
  words: SpaghettiWord[];
  /** Nombre d'éléments animés (lettres ou mots). */
  count: number;
  /** Décalage entre deux éléments, en millisecondes. */
  stepMs: number;
}

/** Décalage entre deux éléments : celui de Rabbit, réduit pour qu'un long texte reste sous l'étalement maximal. */
export function spaghettiStepMs(mode: SpaghettiMode, count: number): number {
  const base = mode === 'chars' ? SPAGHETTI.charStepMs : SPAGHETTI.wordStepMs;
  if (count <= 1) return base;
  const capped = SPAGHETTI.maxSpreadMs[mode] / (count - 1);
  return Math.round(Math.min(base, capped) * 100) / 100;
}

export function planSpaghetti(text: string, mode: SpaghettiMode): SpaghettiPlan {
  const words = splitWords(text);
  let counter = 0;
  const planned: SpaghettiWord[] = words.map((word) => {
    if (mode === 'words') {
      const entry: SpaghettiWord = { text: word, index: counter };
      counter += 1;
      return entry;
    }
    const chars = splitChars(word).map((char) => {
      const unit: SpaghettiUnit = { index: counter, text: char };
      counter += 1;
      return unit;
    });
    return { text: word, chars };
  });
  return { mode, words: planned, count: counter, stepMs: spaghettiStepMs(mode, counter) };
}
