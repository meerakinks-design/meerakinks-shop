'use client';

import Link from 'next/link';
import { useRef, useState, type CSSProperties } from 'react';
import { cloudinaryTransform } from '@/lib/cloudinary-url';
import { categoryPath, productPath } from '@/lib/constants/routes';
import { formatFcfa } from '@/lib/money';
import { effectivePrice, hasPromotion } from '@/lib/shop/product-display';
import type { CategorySection } from '@/lib/shop/sections';
import { CardCartControl } from './CardCartControl';
import { ProductImage } from './ProductImage';

/**
 * Une section pleine largeur par catégorie (référence My Frida) : sa couleur, son titre, un carrousel de pastilles
 * et le gros visuel du produit choisi. Les sections sont « sticky » (CSS) et s'empilent au défilement ; l'empilement
 * est désactivé quand l'utilisateur demande moins de mouvement.
 */
export function CategorySections({ sections }: { sections: readonly CategorySection[] }) {
  return (
    <div className="category-sections">
      {sections.map((section, index) => (
        <CategoryBlock key={section.category.id} section={section} index={index} />
      ))}
    </div>
  );
}

function CategoryBlock({ section, index }: { section: CategorySection; index: number }) {
  const { category, products, background, textColor } = section;
  const [selected, setSelected] = useState(0);
  const trackRef = useRef<HTMLUListElement>(null);
  const product = products[selected] ?? products[0];
  if (!product) return null;

  function scrollTrack(direction: -1 | 1) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    trackRef.current?.scrollBy({ left: direction * 260, behavior: reduced ? 'auto' : 'smooth' });
  }

  const style = { '--section-bg': background, '--section-fg': textColor, zIndex: index + 1 } as CSSProperties;
  const headingId = `categorie-${category.slug}`;

  return (
    <section className="category-section" style={style} aria-labelledby={headingId}>
      <div className="container">
        <h2 id={headingId} className="category-title">
          {category.name}
        </h2>
        {category.description && <p className="category-description">{category.description}</p>}

        <div className="carousel">
          <button type="button" className="carousel-arrow" onClick={() => scrollTrack(-1)} aria-label={`Produits précédents de ${category.name}`}>
            <span aria-hidden="true">‹</span>
          </button>
          <ul className="carousel-track" ref={trackRef}>
            {products.map((item, itemIndex) => (
              <li key={item.id}>
                <button type="button" className="pill" aria-pressed={itemIndex === selected} onClick={() => setSelected(itemIndex)}>
                  <span className="pill-thumb">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cloudinaryTransform(item.image.url, 'c_fill,ar_1:1,w_160,f_auto,q_auto')} alt="" width={64} height={64} loading="lazy" />
                    ) : null}
                  </span>
                  <span className="pill-text">
                    <strong>{item.name}</strong>
                    <small>{formatFcfa(effectivePrice(item))}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="carousel-arrow" onClick={() => scrollTrack(1)} aria-label={`Produits suivants de ${category.name}`}>
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <div className="category-feature" aria-live="polite">
          <Link href={productPath(product.slug)} className="feature-media" aria-label={`Voir ${product.name}`}>
            <ProductImage image={product.image} sizes="(min-width: 900px) 40vw, 80vw" />
          </Link>
          <div className="feature-info">
            <h3>
              <Link href={productPath(product.slug)}>{product.name}</Link>
            </h3>
            <p className="product-card-price">
              {hasPromotion(product) && <s>{formatFcfa(product.price)}</s>} <strong>{formatFcfa(effectivePrice(product))}</strong>
            </p>
            <CardCartControl product={{ id: product.id, name: product.name, price: effectivePrice(product), stock: product.stock }} />
            <Link className="section-link" href={productPath(product.slug)}>
              Voir le produit
            </Link>
          </div>
        </div>

        <Link className="section-link" href={categoryPath(category.slug)}>
          Voir toute la catégorie
        </Link>
      </div>
    </section>
  );
}
