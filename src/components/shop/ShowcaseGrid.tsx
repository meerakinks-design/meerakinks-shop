import { SHOWCASE_PRODUCTS, type ShowcaseProduct } from '@/content/vitrine';
import { ShowcaseCard } from './ShowcaseCard';

/** Nombre de dispositions différentes : la grille répète le même enchaînement tous les six soins (voir showcase.css). */
export const SHOWCASE_SLOTS = 6;

interface ShowcaseGridProps {
  products?: readonly ShowcaseProduct[];
}

/**
 * Grille de la boutique, façon Hello Hello : deux colonnes sur téléphone avec des photos de tailles différentes, alignées
 * à gauche ou à droite et légèrement décalées en hauteur. La disposition dépend seulement de la place du soin dans la liste :
 * elle est identique à chaque chargement (aucune erreur d'hydratation).
 */
export function ShowcaseGrid({ products = SHOWCASE_PRODUCTS }: ShowcaseGridProps) {
  return (
    <ul className="showcase-grid">
      {products.map((product, index) => (
        <li key={product.id} className="showcase-cell" data-slot={index % SHOWCASE_SLOTS}>
          <ShowcaseCard product={product} slot={index % SHOWCASE_SLOTS} priority={index < 2} />
        </li>
      ))}
    </ul>
  );
}
