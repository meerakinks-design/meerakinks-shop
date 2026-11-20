// Disposition « aléatoire » de la grille (décision D-12). Aléatoire en apparence, STABLE en réalité :
// calculée à partir de l'identifiant du produit, donc identique à chaque chargement et sur le serveur
// comme dans le navigateur (aucun saut de page, aucune erreur d'hydratation).

export type GridSize = 'small' | 'medium' | 'large';
export interface GridSlot {
  size: GridSize;
  /** Décalage vertical : 0 aucun, 1 léger, 2 marqué. */
  offset: 0 | 1 | 2;
}

/** FNV-1a 32 bits : simple, rapide, bien réparti. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function slotForProduct(productId: string): GridSlot {
  const hash = hashString(productId);
  const bucket = hash % 10;
  const size: GridSize = bucket < 4 ? 'small' : bucket < 8 ? 'medium' : 'large';
  const offset = (Math.floor(hash / 10) % 3) as 0 | 1 | 2;
  return { size, offset };
}

/** L'ordre reste celui choisi par la vendeuse (ordre d'affichage) ; seules la taille et le décalage varient. */
export function arrangeGrid<T extends { id: string }>(items: readonly T[]): Array<T & { slot: GridSlot }> {
  return items.map((item) => ({ ...item, slot: slotForProduct(item.id) }));
}
