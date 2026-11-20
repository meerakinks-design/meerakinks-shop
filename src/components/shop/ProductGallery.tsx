'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ProductImage } from './ProductImage';

function Arrow({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={direction === 'prev' ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6'} />
    </svg>
  );
}

/**
 * Galerie balayable (cahier §4.3) : les photos défilent au doigt (défilement natif aimanté), avec flèches
 * précédent/suivant en surimpression et pastilles de position. La première photo est chargée en priorité (LCP).
 */
export function ProductGallery({ images, name }: { images: ReadonlyArray<{ url: string; alt: string }>; name: string }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const frame = useRef(0);
  const [index, setIndex] = useState(0);
  const count = images.length;

  const goTo = useCallback(
    (target: number) => {
      const track = trackRef.current;
      if (!track || count < 2) return;
      const next = (target + count) % count; // boucle : après la dernière photo, retour à la première
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      track.scrollTo({ left: next * track.clientWidth, behavior: calm ? 'auto' : 'smooth' });
    },
    [count],
  );

  const handleScroll = useCallback(() => {
    if (frame.current) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = 0;
      const track = trackRef.current;
      if (track && track.clientWidth > 0) setIndex(Math.round(track.scrollLeft / track.clientWidth));
    });
  }, []);

  useEffect(() => () => window.cancelAnimationFrame(frame.current), []);

  const slides = count > 0 ? images : [null];

  return (
    <div className="gallery" role="group" aria-roledescription="carrousel" aria-label={`Photos de ${name}`}>
      <div className="gallery-stage">
        <ul className="gallery-track" ref={trackRef} onScroll={handleScroll} tabIndex={count > 1 ? 0 : -1}>
          {slides.map((image, position) => (
            <li key={image?.url ?? 'placeholder'} className="gallery-slide" role="group" aria-roledescription="diapositive" aria-label={`Photo ${position + 1} sur ${slides.length}`}>
              <ProductImage image={image} sizes="(min-width: 900px) 50vw, 100vw" priority={position === 0} widths={[480, 720, 960, 1200]} />
            </li>
          ))}
        </ul>
        {count > 1 && (
          <>
            <button type="button" className="gallery-arrow gallery-prev" onClick={() => goTo(index - 1)} aria-label="Photo précédente">
              <Arrow direction="prev" />
            </button>
            <button type="button" className="gallery-arrow gallery-next" onClick={() => goTo(index + 1)} aria-label="Photo suivante">
              <Arrow direction="next" />
            </button>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="gallery-dots">
          {images.map((image, position) => (
            <button key={image.url} type="button" className="gallery-dot" aria-label={`Voir la photo ${position + 1} sur ${count}`} aria-current={position === index ? 'true' : undefined} onClick={() => goTo(position)} />
          ))}
        </div>
      )}
    </div>
  );
}
