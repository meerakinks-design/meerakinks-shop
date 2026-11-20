// Calculs d'argent côté serveur : la seule source officielle des montants (RM-01 à RM-03).
// Entiers FCFA uniquement. Un total venu du navigateur n'est JAMAIS utilisé.

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

export const lineTotal = (line: PricedLine): number => line.unitPrice * line.quantity;

export const computeSubtotal = (lines: readonly PricedLine[]): number => lines.reduce((sum, line) => sum + lineTotal(line), 0);

// total = sous-total + frais ; null tant que les frais sont inconnus (RM-03). Défini dans lib/shop/order-amounts.ts
// (partagé avec le formulaire de commande) et ré-exporté ici pour les services.
export { computeTotal } from '@/lib/shop/order-amounts';
