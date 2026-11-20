/** 12500 → « 12 500 FCFA » (le FCFA n'a pas de décimales). */
export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} FCFA`;
}

/** Lit un montant saisi à la main : « 12 500 », « 12.500 FCFA » → 12500. Vide ou sans chiffre → null. */
export function parseFcfaInput(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  if (digits === '' || digits.length > 12) return null;
  return Number(digits);
}
