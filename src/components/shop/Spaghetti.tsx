'use client';

import { Fragment, useEffect, useRef, type CSSProperties, type ElementType } from 'react';
import { planSpaghetti, type SpaghettiMode } from '@/lib/shop/spaghetti';

type SpaghettiTag = 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';

interface SpaghettiProps {
  /** Balise rendue. */
  as?: SpaghettiTag;
  /** `chars` : lettre par lettre (titres, comme Rabbit Shop). `words` : mot par mot (textes courants). Par défaut : lettres pour h1 et h2, mots ailleurs. */
  mode?: SpaghettiMode;
  /** `scroll` : l'effet se joue quand le texte entre dans les 85 % de l'écran. `mount` : dès l'affichage (Hero), sans délai. */
  trigger?: 'scroll' | 'mount';
  id?: string;
  className?: string;
  /** Mots-clés affichés en « ghost » (contour sans remplissage), comparés sans majuscule ni ponctuation. Sans effet sur le texte ni sur le nom accessible. */
  ghost?: readonly string[];
  /** Texte brut uniquement : jamais de balises, de liens ni de prix (voir les exceptions de la landing §26). */
  children: string;
}

const defaultMode = (tag: SpaghettiTag): SpaghettiMode => (tag === 'h1' || tag === 'h2' ? 'chars' : 'words');

/** Un mot sans sa ponctuation de bord ni sa casse : « kinks, » et « Kinks » désignent le même mot-clé. */
const bare = (word: string) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLocaleLowerCase('fr');

/**
 * Effet « spaghetti » (D-18, D-29). Le texte complet est dans le HTML dès le rendu serveur : sans JavaScript,
 * avec un robot ou un lecteur d'écran, rien ne change. L'animation est du CSS pur (src/styles/spaghetti.css) ;
 * ce composant ne fait que l'activer au bon moment :
 *  - Hero (`trigger="mount"`) : actif dès le premier affichage, aucun délai, aucun JavaScript nécessaire ;
 *  - ailleurs : un texte encore sous la ligne des 85 % de l'écran est masqué puis joué à son arrivée ; un texte
 *    déjà visible reste tel quel (aucun clignotement) ; il se rejoue s'il repasse sous l'écran puis revient.
 * Mouvement réduit : le CSS neutralise tout et ce composant ne masque rien.
 */
export default function Spaghetti({ as = 'span', mode, trigger = 'scroll', id, className, ghost, children }: SpaghettiProps) {
  const ref = useRef<HTMLElement>(null);
  const resolvedMode = mode ?? defaultMode(as);
  const plan = planSpaghetti(children, resolvedMode);
  const Tag = as as ElementType;
  const ghostWords = new Set((ghost ?? []).map(bare));

  useEffect(() => {
    const element = ref.current;
    if (!element || trigger === 'mount') return;
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Déjà dans la zone (au-dessus de la ligne des 85 %) : on ne touche à rien, le texte reste visible.
    if (element.getBoundingClientRect().top >= window.innerHeight * 0.85) element.setAttribute('data-sp', 'hidden');

    const enter = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && element.getAttribute('data-sp') === 'hidden') element.setAttribute('data-sp', 'in');
        }
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    // Sorti par le bas de l'écran : on le réarme pour qu'il se rejoue au retour (équivalent du « reverse » de Rabbit).
    const leave = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0 && element.getAttribute('data-sp') === 'in') {
          element.setAttribute('data-sp', 'hidden');
        }
      }
    });
    enter.observe(element);
    leave.observe(element);
    return () => {
      enter.disconnect();
      leave.disconnect();
      element.removeAttribute('data-sp');
    };
  }, [trigger]);

  const rootStyle = { '--sp-step': `${plan.stepMs}ms` } as CSSProperties;
  const classes = ['sp', resolvedMode === 'chars' ? 'sp-chars' : 'sp-words', className].filter(Boolean).join(' ');
  const rootProps = {
    ref,
    id,
    className: classes,
    style: rootStyle,
    ...(trigger === 'mount' ? { 'data-sp': 'in' } : {}),
    // Lettres : le titre garde un nom accessible complet, les lettres sont masquées aux lecteurs d'écran.
    ...(resolvedMode === 'chars' ? { 'aria-label': plan.words.map((word) => word.text).join(' ') } : {}),
  };

  const words = plan.words.map((word, wordIndex) => {
    const content =
      resolvedMode === 'chars' ? (
        <span className={ghostWords.has(bare(word.text)) ? 'sp-w is-ghost' : 'sp-w'}>
          {word.chars?.map((char) => (
            <span key={char.index} className="sp-u" style={{ '--i': char.index } as CSSProperties}>
              {char.text}
            </span>
          ))}
        </span>
      ) : (
        <span className={ghostWords.has(bare(word.text)) ? 'sp-w sp-u is-ghost' : 'sp-w sp-u'} style={{ '--i': word.index } as CSSProperties}>
          {word.text}
        </span>
      );
    return (
      <Fragment key={wordIndex}>
        {wordIndex > 0 ? ' ' : null}
        {content}
      </Fragment>
    );
  });

  return (
    <Tag {...rootProps}>
      {resolvedMode === 'chars' ? <span aria-hidden="true">{words}</span> : words}
    </Tag>
  );
}
