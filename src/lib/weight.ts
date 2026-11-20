export type WeightUnit = 'g' | 'kg';

/** « 250 » g ou « 1,5 » kg → grammes. Rend null si la saisie n'est pas un poids valide. */
export function parseWeightToGrams(text: string, unit: WeightUnit): number | null {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.');
  if (unit === 'g') {
    if (!/^\d{1,9}$/.test(normalized)) return null;
    const grams = Number(normalized);
    return grams >= 1 ? grams : null;
  }
  if (!/^\d{1,6}(\.\d{1,3})?$/.test(normalized)) return null;
  const grams = Math.round(Number(normalized) * 1000);
  return grams >= 1 ? grams : null;
}

/** Pré-remplit le formulaire : 1500 → « 1.5 » kg, 250 → « 250 » g. */
export function splitGrams(grams: number): { value: string; unit: WeightUnit } {
  if (grams >= 1000 && grams % 1000 === 0) return { value: String(grams / 1000), unit: 'kg' };
  return { value: String(grams), unit: 'g' };
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(grams / 1000)} kg`;
  return `${grams} g`;
}
