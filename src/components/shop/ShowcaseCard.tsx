import Link from 'next/link';
import type { CSSProperties } from 'react';
import { GAMMES, type GammeKey } from '@/content/catalogue';
import { SHOWCASE } from '@/content/vitrine';
import { productPath } from '@/lib/constants/routes';
import type { ShowcaseCardData } from '@/lib/shop/catalogue';

interface ShowcaseCardProps {
  card: ShowcaseCardData;
  /** Position dans le groupe : fixe la taille, le cadrage et le décalage (voir showcase.css). */
  slot: number;
  /** Photo au-dessus de la ligne de flottaison : chargée tout de suite. */
  priority?: boolean;
}

/** Pastille de couleur du dossier (jaune, orange, marron), reprise des variables de la charte. */
export function GammeDot({ gamme }: { gamme: GammeKey }) {
  return <span className="gamme-dot" style={{ '--gamme': GAMMES[gamme].cssVar } as CSSProperties} aria-hidden="true" />;
}

/**
 * Une photo, puis le nom, le sous-titre de l'étiquette et la contenance (référence Hello Hello : l'image d'abord, le texte en dessous).
 * Une seule photo ici, sans effet au survol ni au toucher : la carte mène à la fiche, où les photos défilent en slide.
 * Un duo ou la gamme complète porte une pastille « Offre ». Pas de prix sur la carte : il est sur la fiche.
 */
export function ShowcaseCard({ card, slot, priority = false }: ShowcaseCardProps) {
  return (
    <article className="showcase-card" data-slot={slot} data-offer={card.isOffer ? 'true' : 'false'}>
      <Link href={productPath(card.slug)} className="showcase-link">
        <div className="showcase-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.image.src} alt={card.image.alt} width={864} height={1152} loading={priority ? 'eager' : 'lazy'} decoding="async" {...(priority ? { fetchPriority: 'high' as const } : {})} />
          {card.isOffer && <span className="showcase-offer">{SHOWCASE.offerBadge}</span>}
        </div>
        <h4 className="showcase-name">{card.name}</h4>
        <span className="showcase-kind">{card.kind}</span>
        <span className="showcase-size">
          {card.gamme ? <GammeDot gamme={card.gamme} /> : <span className="dot" aria-hidden="true" />} {card.meta}
        </span>
      </Link>
    </article>
  );
}
