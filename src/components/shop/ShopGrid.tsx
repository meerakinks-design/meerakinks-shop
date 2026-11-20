import { arrangeGrid } from '@/lib/shop/layout';
import type { ShopProduct } from '@/lib/shop/sections';
import { ProductCard } from './ProductCard';

interface ShopGridProps {
  products: readonly ShopProduct[];
  /** true : grille régulière (pages triées ou filtrées, où l'ordre doit rester lisible). */
  uniform?: boolean;
  showCategory?: boolean;
}

/**
 * Grille de produits (références Hello Hello). Par défaut : disposition asymétrique « aléatoire » mais STABLE
 * (tailles et décalages calculés depuis l'identifiant du produit, voir lib/shop/layout).
 */
export function ShopGrid({ products, uniform = false, showCategory = false }: ShopGridProps) {
  if (uniform) {
    return (
      <ul className="uniform-grid">
        {products.map((product, index) => (
          <li key={product.id}>
            <ProductCard product={product} showCategory={showCategory} priority={index < 2} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="shop-grid">
      {arrangeGrid(products).map(({ slot, ...product }, index) => (
        <li key={product.id} className={`grid-cell size-${slot.size} offset-${slot.offset}`}>
          <ProductCard product={product} showCategory={showCategory} priority={index < 2} sizes={slot.size === 'large' ? '(min-width: 900px) 50vw, 100vw' : '(min-width: 900px) 25vw, 50vw'} />
        </li>
      ))}
    </ul>
  );
}
