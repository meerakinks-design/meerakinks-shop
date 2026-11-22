'use client';

import { isOutOfStock, maxOrderableQuantity } from '@/lib/shop/product-display';
import { QuantityStepper } from './QuantityStepper';
import { useCart } from './CartProvider';

interface CardCartControlProps {
  product: { id: string; name: string; price: number; stock: number | null };
  /** « floating » : pastille en coin de photo (défaut). « bar » : barre pleine largeur sous la photo (cartes de la boutique). */
  variant?: 'floating' | 'bar';
}

/**
 * Bouton d'ajout des cartes (décision D-12, P-04) :
 *  - ordinateur : « + Ajouter » apparaît au survol et au focus clavier (règles CSS .card-add) ;
 *  - écran tactile : le « + » est toujours visible ;
 *  - une fois ajouté : « − 2 + » sur la carte, sans ouvrir le panier.
 */
export function CardCartControl({ product, variant = 'floating' }: CardCartControlProps) {
  const { hydrated, quantityOf, add, setQuantity } = useCart();
  if (isOutOfStock(product.stock)) return null; // le badge « Épuisé » est déjà affiché sur la carte

  const quantity = hydrated ? quantityOf(product.id) : 0;
  if (quantity > 0) {
    return (
      <div className={`card-stepper${variant === 'bar' ? ' is-bar' : ''}`}>
        <QuantityStepper compact label={product.name} value={quantity} max={maxOrderableQuantity(product.stock)} onChange={(next) => setQuantity(product.id, next, maxOrderableQuantity(product.stock))} />
      </div>
    );
  }
  return (
    <button type="button" className={`card-add${variant === 'bar' ? ' is-bar' : ''}`} onClick={() => add(product)} aria-label={`Ajouter ${product.name} au panier`}>
      <span className="card-add-label">{variant === 'bar' ? 'Ajouter au panier' : 'Ajouter'}</span>
      <span aria-hidden="true" className="card-add-plus">
        +
      </span>
    </button>
  );
}
