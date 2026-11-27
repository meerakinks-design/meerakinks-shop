import type { ShowcaseCardData } from '@/lib/shop/catalogue';
import { ShowcaseCard } from './ShowcaseCard';

/** Nombre de dispositions différentes : la grille répète le même enchaînement tous les six soins (voir showcase.css). */
export const SHOWCASE_SLOTS = 6;

interface ShowcaseGridProps {
  cards: readonly ShowcaseCardData[];
  /** Nombre de premières photos chargées tout de suite (au-dessus de la ligne de flottaison). */
  priorityCount?: number;
}

/**
 * Grille d'un groupe, façon Hello Hello : deux colonnes sur téléphone avec des photos de tailles différentes, alignées
 * à gauche ou à droite et légèrement décalées en hauteur. La disposition dépend seulement de la place de la carte dans le groupe :
 * elle est identique à chaque chargement (aucune erreur d'hydratation). Un groupe d'une seule carte (la gamme complète) est
 * présenté en grand, au centre.
 */
export function ShowcaseGrid({ cards, priorityCount = 0 }: ShowcaseGridProps) {
  return (
    <ul className="showcase-grid" data-single={cards.length === 1 ? 'true' : 'false'}>
      {cards.map((card, index) => (
        <li key={card.slug} className="showcase-cell" data-slot={index % SHOWCASE_SLOTS}>
          <ShowcaseCard card={card} slot={index % SHOWCASE_SLOTS} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
