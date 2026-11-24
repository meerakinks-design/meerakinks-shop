'use client';

import { useEffect, useRef, useState } from 'react';
import type { FocusEvent, MouseEvent, PointerEvent } from 'react';
import { AKATECH_LOGO_SRC, AKATECH_NAME, AKATECH_URL } from '@/lib/constants/credits';

const TOUCH_LINGER_MS = 1400;

type Follow = { x: number; y: number; tx: number; ty: number; raf: number; placed: boolean };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/** Fait glisser la carte vers sa cible, avec une légère inclinaison selon la vitesse. Mouvement réduit : placement immédiat, sans inclinaison. */
function tick(card: HTMLElement, follow: Follow) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = reduced ? 1 : 0.2;
  const dx = follow.tx - follow.x;
  follow.x += dx * ease;
  follow.y += (follow.ty - follow.y) * ease;
  card.style.transform = `translate3d(${follow.x.toFixed(1)}px, ${follow.y.toFixed(1)}px, 0)`;
  card.style.setProperty('--credit-tilt', reduced ? '0deg' : `${clamp(dx * 0.07, -10, 10).toFixed(2)}deg`);
  const moving = Math.abs(follow.tx - follow.x) > 0.3 || Math.abs(follow.ty - follow.y) > 0.3;
  follow.raf = moving ? requestAnimationFrame(() => tick(card, follow)) : 0;
}

/** Vise un point : centré sur le pointeur, au-dessus (ou dessous s'il n'y a pas la place), jamais hors de l'écran. */
function aim(card: HTMLElement, follow: Follow, clientX: number, clientY: number, lift: number) {
  const width = card.offsetWidth;
  const height = card.offsetHeight;
  follow.tx = clamp(clientX - width / 2, 8, window.innerWidth - width - 8);
  const above = clientY - height - lift;
  follow.ty = above >= 8 ? above : clientY + lift;
  if (!follow.placed) {
    follow.x = follow.tx;
    follow.y = follow.ty;
    follow.placed = true;
  }
  if (!follow.raf) follow.raf = requestAnimationFrame(() => tick(card, follow));
}

/**
 * Crédit du pied de page (« Créé par AKATech Studio »), repris de Mon E-Carnet. Au survol (souris) ou pendant qu'on y
 * pose le doigt, le logo apparaît près du pointeur et le suit ; au clavier, il apparaît au-dessus du nom. Le visuel est
 * décoratif : le nom reste un vrai lien (nouvel onglet). Si le fichier du logo manque, la carte affiche le nom écrit.
 */
export function FooterCredit() {
  const cardRef = useRef<HTMLSpanElement>(null);
  const follow = useRef<Follow>({ x: 0, y: 0, tx: 0, ty: 0, raf: 0, placed: false });
  const hideTimer = useRef<number | undefined>(undefined);
  const lastPointer = useRef('mouse');
  const [open, setOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  // Charge le logo quand le navigateur est au repos : la première apparition n'attend pas le réseau.
  useEffect(() => {
    const preload = () => {
      const image = new Image();
      image.onerror = () => setLogoFailed(true);
      image.src = AKATECH_LOGO_SRC;
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preload);
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(preload, 1200);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const state = follow.current;
    return () => {
      window.clearTimeout(hideTimer.current);
      cancelAnimationFrame(state.raf);
    };
  }, []);

  const show = (clientX: number, clientY: number, lift: number) => {
    window.clearTimeout(hideTimer.current);
    if (cardRef.current) aim(cardRef.current, follow.current, clientX, clientY, lift);
    setOpen(true);
  };
  const move = (clientX: number, clientY: number, lift: number) => {
    if (cardRef.current) aim(cardRef.current, follow.current, clientX, clientY, lift);
  };
  const hide = () => {
    window.clearTimeout(hideTimer.current);
    setOpen(false);
    follow.current.placed = false;
  };

  const triggerProps = {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      lastPointer.current = event.pointerType;
      if (event.pointerType !== 'touch') show(event.clientX, event.clientY, 22);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'touch') move(event.clientX, event.clientY, 40);
      else if (open) move(event.clientX, event.clientY, 22);
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'touch') hide();
    },
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      lastPointer.current = event.pointerType;
      if (event.pointerType === 'touch') show(event.clientX, event.clientY, 40);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'touch') hideTimer.current = window.setTimeout(hide, TOUCH_LINGER_MS);
    },
    onPointerCancel: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'touch') hide();
    },
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      if (lastPointer.current === 'touch') event.preventDefault();
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.matches(':focus-visible')) return;
      const rect = event.currentTarget.getBoundingClientRect();
      show(rect.left + rect.width / 2, rect.top, 14);
    },
    onBlur: hide,
  };

  return (
    <span className="credit-reveal">
      <a className="credit-reveal__link" href={AKATECH_URL} target="_blank" rel="noopener noreferrer" aria-label={`${AKATECH_NAME}, site web (s’ouvre dans un nouvel onglet)`} {...triggerProps}>
        {AKATECH_NAME}
      </a>
      <span ref={cardRef} className="credit-reveal__card" data-open={open ? 'true' : 'false'} aria-hidden="true">
        <span className="credit-reveal__frame">
          {logoFailed ? (
            <span className="credit-reveal__fallback">{AKATECH_NAME}</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- petit visuel décoratif local, préchargé au repos
            <img src={AKATECH_LOGO_SRC} alt="" width={176} height={176} decoding="async" draggable={false} onError={() => setLogoFailed(true)} />
          )}
        </span>
      </span>
    </span>
  );
}
