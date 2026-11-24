'use client';

import { useEffect, useRef } from 'react';

/**
 * Scène scroll de la landing : canvas fixe (GLB élixir puis brume) + défilement Lenis / GSAP ScrollTrigger.
 * Rien n'est lancé si l'utilisateur demande moins de mouvement ou économise les données : les visuels 2D restent seuls.
 * Le moteur (three, lenis, gsap) est chargé à la demande, hors du bundle initial.
 */
export function ScrollStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = document.documentElement;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || saveData) {
      root.dataset.stage = 'off';
      return;
    }
    let disposed = false;
    let stop: () => void = () => undefined;
    import('@/lib/stage/engine')
      .then(({ startStage }) => startStage(canvas))
      .then((cleanup) => {
        if (disposed) cleanup();
        else stop = cleanup;
      })
      .catch(() => {
        root.dataset.stage = 'off'; // pas de WebGL : on garde les images 2D
      });
    return () => {
      disposed = true;
      stop();
      if (root.dataset.stage === 'off') delete root.dataset.stage;
    };
  }, []);

  return <canvas ref={canvasRef} className="stage-canvas" aria-hidden="true" />;
}
