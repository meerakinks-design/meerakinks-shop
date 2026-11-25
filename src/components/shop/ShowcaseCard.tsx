'use client';

import { useState } from 'react';
import { SHOWCASE, type ShowcaseProduct } from '@/content/vitrine';

interface ShowcaseCardProps {
  product: ShowcaseProduct;
  /** Position dans la grille : fixe la taille, le cadrage et le décalage (voir showcase.css). */
  slot: number;
  /** Photos au-dessus de la ligne de flottaison : chargées tout de suite. */
  priority?: boolean;
}

/**
 * Une photo, puis le nom, le type de soin et la contenance (référence Hello Hello : l'image d'abord, le texte en dessous).
 * Quand le soin a une deuxième photo, elle apparaît au survol (ordinateur) ou au toucher (téléphone). Pas de lien ni de prix
 * pour l'instant : la fiche produit et les prix arrivent à l'étape suivante.
 */
export function ShowcaseCard({ product, slot, priority = false }: ShowcaseCardProps) {
  const [showSecond, setShowSecond] = useState(false);
  const [first, second] = product.images;

  return (
    <article className="showcase-card" data-slot={slot}>
      <div className="showcase-media" data-second={showSecond ? 'true' : 'false'}>
        {/* eslint-disable @next/next/no-img-element */}
        <img src={first.src} alt={first.alt} width={864} height={1152} loading={priority ? 'eager' : 'lazy'} decoding="async" {...(priority ? { fetchPriority: 'high' as const } : {})} />
        {second && <img className="showcase-second" src={second.src} alt="" aria-hidden="true" width={864} height={1152} loading="lazy" decoding="async" />}
        {/* eslint-enable @next/next/no-img-element */}
        {second && <span className="showcase-dots" aria-hidden="true"><i /><i /></span>}
        {second && (
          <button type="button" className="showcase-switch" aria-pressed={showSecond} aria-label={`${SHOWCASE.switchLabel} ${product.name}`} onClick={() => setShowSecond((value) => !value)} />
        )}
      </div>
      <h3 className="showcase-name">{product.name}</h3>
      <span className="showcase-kind">{product.kind}</span>
      <span className="showcase-size">
        <span className="dot" aria-hidden="true" /> {product.size}
      </span>
    </article>
  );
}
