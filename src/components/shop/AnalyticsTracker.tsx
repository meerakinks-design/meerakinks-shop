'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ANALYTICS_HEARTBEAT_SECONDS, ensureVisitorKey, utmSourceFromSearch } from '@/lib/analytics/client';
import {
  TRACK_API_PATH,
  TRACK_ARRIVAL_API_PATH,
  TRACK_BROWSER_EVENT,
  isTrackTarget,
  type FunnelEvent,
  type TrackEventType,
} from '@/lib/analytics/events';
import { useConsent } from './useConsent';

// Analytique maison (cahier §7.6). Ne fait RIEN avant « Accepter » : ce composant n'est monté qu'à ce moment-là.
// Il envoie : la page vue, le bouton touché (attribut `data-track` de la liste fermée), les étapes du parcours
// signalées par les composants (`trackStep`) et un signal d'activité tant que l'onglet est visible. Jamais de texte
// saisi, de montant, ni de contenu de formulaire.

const ARRIVAL_FLAG = 'boutique_arrival';

interface Payload {
  type: TrackEventType;
  path?: string;
  target?: string;
  utmSource?: string;
  referrer?: string;
  seconds?: number;
}

function send(visitorKey: string, payload: Payload, options: { beacon?: boolean } = {}): Promise<void> {
  const body = JSON.stringify({ visitorKey, ...payload });
  try {
    if (options.beacon && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(TRACK_API_PATH, new Blob([body], { type: 'application/json' }));
      return Promise.resolve();
    }
    return fetch(TRACK_API_PATH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).then(
      () => undefined,
      () => undefined,
    );
  } catch {
    return Promise.resolve();
  }
}

function signalArrivalOnce(visitorKey: string): void {
  try {
    if (window.sessionStorage.getItem(ARRIVAL_FLAG)) return;
    window.sessionStorage.setItem(ARRIVAL_FLAG, '1');
  } catch {
    /* stockage indisponible : le serveur déduplique de toute façon */
  }
  void fetch(TRACK_ARRIVAL_API_PATH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitorKey }), keepalive: true }).catch(() => undefined);
}

export function AnalyticsTracker() {
  const consent = useConsent();
  const pathname = usePathname();
  const memory = useRef<{ key: string | null }>({ key: null });
  const loadSent = useRef(false);
  const activeSince = useRef<number | null>(null);

  // Page vue (et fiche produit vue) à chaque changement de page.
  useEffect(() => {
    if (consent !== 'granted' || !pathname) return;
    const { key } = ensureVisitorKey(memory.current);
    const first = !loadSent.current;
    loadSent.current = true;
    const extra: Payload = first ? { type: 'page_view', path: pathname, ...(document.referrer ? { referrer: document.referrer } : {}), ...(utmSourceFromSearch(window.location.search) ? { utmSource: utmSourceFromSearch(window.location.search) as string } : {}) } : { type: 'page_view', path: pathname };
    void send(key, extra).then(() => {
      if (first) signalArrivalOnce(key);
    });
    if (pathname.startsWith('/produit/')) void send(key, { type: 'product_view', path: pathname });
  }, [consent, pathname]);

  // Bouton touché, étapes du parcours, signal d'activité.
  useEffect(() => {
    if (consent !== 'granted') return;

    const onClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest('[data-track]') : null;
      const target = element?.getAttribute('data-track');
      if (!isTrackTarget(target)) return;
      const { key } = ensureVisitorKey(memory.current);
      void send(key, { type: 'click', target, path: window.location.pathname });
    };

    const onStep = (event: Event) => {
      const type = (event as CustomEvent<{ type?: FunnelEvent }>).detail?.type;
      if (!type) return;
      const { key } = ensureVisitorKey(memory.current);
      void send(key, { type, path: window.location.pathname });
    };

    const flushActivity = (beacon: boolean) => {
      if (activeSince.current === null) return;
      const seconds = Math.min(Math.round((Date.now() - activeSince.current) / 1000), 40);
      activeSince.current = beacon ? null : Date.now();
      if (seconds <= 0) return;
      const { key } = ensureVisitorKey(memory.current);
      void send(key, { type: 'heartbeat', seconds }, { beacon });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushActivity(true);
      else activeSince.current = Date.now();
    };

    if (document.visibilityState === 'visible') activeSince.current = Date.now();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') flushActivity(false);
    }, ANALYTICS_HEARTBEAT_SECONDS * 1000);

    document.addEventListener('click', onClick, true);
    window.addEventListener(TRACK_BROWSER_EVENT, onStep);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener(TRACK_BROWSER_EVENT, onStep);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onVisibility);
      activeSince.current = null;
    };
  }, [consent]);

  return null;
}
