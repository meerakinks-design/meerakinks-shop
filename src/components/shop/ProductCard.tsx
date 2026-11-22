import Link from 'next/link';
import { productPath } from '@/lib/constants/routes';
import { formatFcfa } from '@/lib/money';
import { effectivePrice, hasPromotion, isOutOfStock } from '@/lib/shop/product-display';
import type { ShopProduct } from '@/lib/shop/sections';
import { CardCartControl } from './CardCartControl';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: ShopProduct;
  showCategory?: boolean;
  priority?: boolean;
  sizes?: string;
}

export function ProductCard({ product, showCategory = false, priority = false, sizes = '(min-width: 900px) 25vw, 50vw' }: ProductCardProps) {
  const price = effectivePrice(product);
  const outOfStock = isOutOfStock(product.stock);

  return (
    <article className="product-card">
      <div className="product-card-media">
        {/* Le lien de l'image double celui du nom : masqué des lecteurs d'écran, mais cliquable au doigt. */}
        <Link href={productPath(product.slug)} tabIndex={-1} aria-hidden="true">
          <ProductImage image={product.image} sizes={sizes} priority={priority} />
        </Link>
        {product.isNew && <span className="badge-new">Nouveau</span>}
        {outOfStock && <span className="badge-out">Épuisé</span>}
      </div>
      <h3 className="product-card-name">
        <Link href={productPath(product.slug)}>{product.name}</Link>
      </h3>
      <p className="product-card-price">
        {hasPromotion(product) && <s aria-label={`Ancien prix ${formatFcfa(product.price)}`}>{formatFcfa(product.price)}</s>} <strong>{formatFcfa(price)}</strong>
      </p>
      {showCategory && product.category && (
        <p className="product-card-category">
          <span className="dot" aria-hidden="true" /> {product.category.name}
        </p>
      )}
      <div className="product-card-actions">
        <CardCartControl variant="bar" product={{ id: product.id, name: product.name, price, stock: product.stock }} />
        <Link className="product-card-view" href={productPath(product.slug)}>
          <span>Voir le produit</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        </Link>
      </div>
    </article>
  );
}
