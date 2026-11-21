'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { LANDING } from '@/content/landing';
import type { SmashController, SmashHud } from '@/lib/smash/game';
import Spaghetti from './Spaghetti';

type GameModule = typeof import('@/lib/smash/game');
type CodeState = 'waiting' | 'loading' | 'ready' | 'failed';

const text = LANDING.smash;
const START_HUD: SmashHud = { status: 'ready', score: 0, seconds: 30 };

/**
 * Mini-jeu « Cosmetic Smash » du footer (cahier §4.6, D-19). Rien à voir avec le parcours d'achat : il ne bloque
 * ni les liens du footer, ni le défilement.
 *  - Le code du jeu (`@/lib/smash/game`) est importé À LA DEMANDE quand le footer approche (700 px avant), jamais avant.
 *  - Le jeu ne démarre qu'au clic sur « Jouer » : tant qu'on n'a pas cliqué, aucun canvas, aucune boucle d'animation.
 *  - Moins d'animations demandé (`prefers-reduced-motion`) : le bouton est remplacé par le message validé, et le code n'est pas chargé.
 */
export function SmashGame({ accents }: { accents: readonly string[] }) {
  const titleId = useId();
  const hintId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replayRef = useRef<HTMLButtonElement>(null);
  const moduleRef = useRef<GameModule | null>(null);
  const loadingRef = useRef<Promise<GameModule | null> | null>(null);
  const controllerRef = useRef<SmashController | null>(null);
  const accentsRef = useRef(accents);
  accentsRef.current = accents;

  const [hydrated, setHydrated] = useState(false);
  const [code, setCode] = useState<CodeState>('waiting');
  const [open, setOpen] = useState(false);
  const [hud, setHud] = useState<SmashHud>(START_HUD);
  const [announcement, setAnnouncement] = useState('');
  const previousStatus = useRef(hud.status);

  useEffect(() => setHydrated(true), []);

  const loadCode = useCallback((): Promise<GameModule | null> => {
    if (moduleRef.current) return Promise.resolve(moduleRef.current);
    if (!loadingRef.current) {
      setCode('loading');
      loadingRef.current = import(/* webpackChunkName: "smash" */ '@/lib/smash/game')
        .then((module_) => {
          moduleRef.current = module_;
          setCode('ready');
          return module_;
        })
        .catch(() => {
          loadingRef.current = null;
          setCode('failed');
          return null;
        });
    }
    return loadingRef.current;
  }, []);

  // Chargement différé : quand le footer approche. Pas de préchargement en mode « économie de données » ni si moins d'animations est demandé.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void loadCode();
        }
      },
      { rootMargin: '700px 0px 700px 0px' },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [loadCode]);

  // Le contrôleur est créé à l'ouverture du plateau (premier « Jouer ») et détruit au démontage.
  const accentsKey = accents.join(',');
  useEffect(() => {
    if (!open) return;
    const module_ = moduleRef.current;
    const canvas = canvasRef.current;
    if (!module_ || !canvas) return;
    const controller = module_.createSmash({ canvas, accents: accentsRef.current, onChange: setHud });
    controllerRef.current = controller;
    controller.start();
    controller.focus();
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [open, accentsKey]);

  // Annonces pour les lecteurs d'écran : pause, reprise et fin de partie (jamais à chaque point marqué).
  useEffect(() => {
    const before = previousStatus.current;
    previousStatus.current = hud.status;
    if (hud.status === before) return;
    if (hud.status === 'paused') setAnnouncement(text.livePaused);
    else if (hud.status === 'running' && before === 'paused') setAnnouncement(text.liveResumed);
    else if (hud.status === 'over') setAnnouncement(`${text.over} ${text.score} : ${hud.score}.`);
    else setAnnouncement('');
  }, [hud.status, hud.score]);

  // Fin de partie : le focus va sur « Rejouer » pour les utilisateurs du clavier.
  useEffect(() => {
    if (hud.status === 'over') replayRef.current?.focus({ preventScroll: true });
  }, [hud.status]);

  const play = async () => {
    const module_ = await loadCode();
    if (!module_) return;
    if (open) controllerRef.current?.start();
    else setOpen(true);
    controllerRef.current?.focus();
  };

  const togglePause = () => {
    if (hud.status === 'paused') controllerRef.current?.resume();
    else controllerRef.current?.pause();
  };

  return (
    <section ref={sectionRef} className="container smash" aria-labelledby={titleId} data-smash={open ? hud.status : 'idle'} data-code={code}>
      <Spaghetti as="h2" id={titleId} className="smash-title">
        {text.title}
      </Spaghetti>
      <Spaghetti as="p" className="smash-text">
        {text.text}
      </Spaghetti>

      {!open && (
        <>
          <button type="button" className="btn smash-play" onClick={play} disabled={!hydrated}>
            {text.play}
          </button>
          <p className="smash-reduced">{text.reducedMotion}</p>
        </>
      )}

      {open && (
        <div className="smash-board">
          <div className="smash-hud">
            <p className="smash-stat">
              {text.score} : <strong>{hud.score}</strong>
            </p>
            <p className="smash-stat">
              {text.time} : <strong>{hud.seconds} s</strong>
            </p>
            <div className="smash-actions">
              <button type="button" className="btn btn-quiet" onClick={togglePause} disabled={hud.status === 'over'}>
                {hud.status === 'paused' ? text.resume : text.pause}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => void play()}>
                {text.restart}
              </button>
            </div>
          </div>
          <div className="smash-stage">
            <canvas ref={canvasRef} tabIndex={0} role="group" aria-label={text.boardLabel} aria-describedby={hintId} />
            {hud.status === 'over' && (
              <div className="smash-over">
                <p>{text.over}</p>
                <button ref={replayRef} type="button" className="btn" onClick={() => void play()}>
                  {text.replay}
                </button>
              </div>
            )}
          </div>
          <p id={hintId} className="smash-hint">
            {text.hint}
          </p>
          <p className="visually-hidden" aria-live="polite">
            {announcement}
          </p>
        </div>
      )}
    </section>
  );
}
