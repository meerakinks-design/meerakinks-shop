'use client';

import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { INTRO_SEEN_KEY, prefersReducedMotion } from '@/lib/shop/motion';

/**
 * Loader d'entrée vers la landing (référence « vrai_loader »). Une seule fois par session, sur l'accueil :
 *  1. quatre cercles concentriques (marron, jaune-orangé, orange, beige) s'ouvrent depuis le centre ;
 *  2. les « objets » de la marque — la tête aux deux puffs et des pastilles — apparaissent, flottent, puis s'envolent ;
 *  3. le logo de la marque ferme la séquence ; le rideau se retire et la landing est là.
 * Le contenu de la page est dans le HTML depuis le début (référencement, accessibilité) : le loader n'est qu'un calque.
 * Aucun loader si l'utilisateur demande moins de mouvement, ni sur les autres pages, ni au retour dans la session.
 */
interface IntroLoaderProps {
  logoSrc: string;
  iconSrc: string;
  storeName: string;
}

const ITEMS = [
  { kind: 'icon', x: '-24vw', y: '-27vh', rotation: -18, size: 'item-lg' },
  { kind: 'disc-orange', x: '26vw', y: '-20vh', rotation: 12, size: 'item-md' },
  { kind: 'disc-gold', x: '-27vw', y: '25vh', rotation: 10, size: 'item-md' },
  { kind: 'disc-peach', x: '21vw', y: '24vh', rotation: -14, size: 'item-lg' },
] as const;

export function IntroLoader({ logoSrc, iconSrc, storeName }: IntroLoaderProps) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  // Décision côté navigateur uniquement (sessionStorage) : le serveur ne rend jamais le calque, donc pas de décalage d'hydratation.
  useEffect(() => {
    if (window.location.pathname !== '/' || prefersReducedMotion()) return;
    try {
      if (window.sessionStorage.getItem(INTRO_SEEN_KEY)) return;
      window.sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      /* stockage indisponible (navigation privée) : on joue le loader une fois, sans le mémoriser */
    }
    setActive(true);
  }, []);

  useEffect(() => {
    if (!active || !root.current) return;
    const el = root.current;
    document.documentElement.classList.add('is-intro');
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>('.intro-item');
      const floating: gsap.core.Tween[] = [];
      const targets = ITEMS.map((item) => ({ x: item.x, y: item.y, rotation: item.rotation }));
      const exits = targets.map((t) => ({ x: `${parseFloat(t.x) * 3.5}vw`, y: `${parseFloat(t.y) * 3.5}vh`, rotation: t.rotation * 2.5 }));

      gsap.set('.intro-logo', { xPercent: -50, yPercent: -50, scale: 0.5, opacity: 0 });
      gsap.set(items, { xPercent: -50, yPercent: -50, scale: 0 });

      const tl = gsap.timeline({
        delay: 0.2,
        onComplete: () => {
          document.documentElement.classList.remove('is-intro');
          setActive(false);
        },
      });

      // 1. Cercles concentriques
      tl.to('.intro-revealer', { clipPath: 'circle(100% at 50% 50%)', duration: 0.9, stagger: 0.2, ease: 'power2.inOut' });
      // Les trois premiers cercles s'effacent ; le dernier (beige) reste : c'est le fond des objets et du logo (charte : logo
      // original uniquement sur fond beige).
      tl.set('.intro-revealer-1, .intro-revealer-2, .intro-revealer-3, .intro-bg', { display: 'none' });

      // 2. Objets : apparition, dispersion, flottaison
      items.forEach((item, i) => {
        const target = targets[i];
        if (!target) return;
        tl.to(
          item,
          {
            x: target.x,
            y: target.y,
            scale: 1,
            rotation: target.rotation,
            duration: 0.9,
            ease: 'power3.out',
            onStart: () => {
              const inner = item.firstElementChild;
              if (inner) floating[i] = gsap.to(inner, { y: gsap.utils.random(-12, -22), duration: gsap.utils.random(1.4, 2.2), ease: 'sine.inOut', yoyo: true, repeat: -1 });
            },
          },
          i === 0 ? '-=0.45' : '<0.08',
        );
      });
      tl.to('.intro-logo', { scale: 1, opacity: 1, duration: 0.8, ease: 'power3.out' }, '<');
      tl.to({}, { duration: 0.7 });

      // 3. Envol des objets et du logo, rideau retiré
      tl.add(() => floating.forEach((tween) => tween?.kill()));
      items.forEach((item, i) => {
        const exit = exits[i];
        if (!exit) return;
        tl.to(item, { x: exit.x, y: exit.y, scale: 2.5, rotation: exit.rotation, duration: 0.65, ease: 'power2.in' }, i === 0 ? '>' : '<0.07');
      });
      tl.to('.intro-logo', { y: '-120vh', scale: 2.2, duration: 0.65, ease: 'power2.in' }, '<');
      tl.to(el, { opacity: 0, duration: 0.25, ease: 'none' }, '-=0.1');
    }, el);
    return () => {
      ctx.revert();
      document.documentElement.classList.remove('is-intro');
    };
  }, [active]);

  if (!active) return null;

  return (
    <div ref={root} className="intro-loader" role="status" aria-label={`Chargement de ${storeName}`}>
      <div className="intro-bg" />
      <div className="intro-revealer intro-revealer-1" />
      <div className="intro-revealer intro-revealer-2" />
      <div className="intro-revealer intro-revealer-3" />
      <div className="intro-revealer intro-revealer-4" />
      <div className="intro-items" aria-hidden="true">
        {ITEMS.map((item, index) => (
          <div key={index} className={`intro-item ${item.size}`}>
            {item.kind === 'icon' && <img src={iconSrc} alt="" width={180} height={180} />}
            {item.kind === 'disc-peach' && <span className="intro-disc is-peach" />}
            {item.kind === 'disc-orange' && <span className="intro-disc is-orange" />}
            {item.kind === 'disc-gold' && <span className="intro-disc is-gold" />}
          </div>
        ))}
      </div>
      <div className="intro-logo">
        <img src={logoSrc} alt="" width={240} height={94} />
      </div>
    </div>
  );
}
