import { ANALYTICS_HEARTBEAT_SECONDS, ANALYTICS_VISITOR_COOKIE_DAYS } from '@/lib/constants/retention';
import { TRACK_BROWSER_EVENT, TRACK_LIMITS, VISITOR_COOKIE_NAME, VISITOR_KEY_PATTERN, type FunnelEvent } from '@/lib/analytics/events';

// Outils du navigateur pour l'analytique maison. Rien ici ne s'exécute sans consentement : `AnalyticsTracker` n'est
// monté en action qu'après « Accepter », et un composant qui appelle `trackStep` sans traqueur actif ne déclenche rien.

/** Signale une étape du parcours (ajout au panier, commande envoyée…). Sans effet si la mesure n'est pas active. */
export function trackStep(type: FunnelEvent): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TRACK_BROWSER_EVENT, { detail: { type } }));
}

/** 128 bits aléatoires en hexadécimal (32 caractères). */
export function generateVisitorKey(fill: (bytes: Uint8Array) => void = (bytes) => void crypto.getRandomValues(new Uint8Array(bytes.buffer as ArrayBuffer))): string {
  const bytes = new Uint8Array(16);
  fill(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function serializeVisitorCookie(key: string, options: { secure: boolean }): string {
  const maxAge = ANALYTICS_VISITOR_COOKIE_DAYS * 24 * 60 * 60;
  return `${VISITOR_COOKIE_NAME}=${key}; Path=/; Max-Age=${maxAge}; SameSite=Lax${options.secure ? '; Secure' : ''}`;
}

export function readVisitorKeyFromCookieHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === VISITOR_COOKIE_NAME) {
      const value = rest.join('=');
      return VISITOR_KEY_PATTERN.test(value) ? value : null;
    }
  }
  return null;
}

export interface VisitorKeyResult {
  key: string;
  /** true : ce navigateur n'avait pas encore d'identifiant (première visite, ou cookie expiré). */
  isNew: boolean;
}

/** Retrouve l'identifiant du visiteur, ou en crée un (cookie posé APRÈS consentement). Cookies bloqués : identifiant gardé en mémoire. */
export function ensureVisitorKey(memory: { key: string | null }): VisitorKeyResult {
  let existing: string | null = null;
  try {
    existing = readVisitorKeyFromCookieHeader(document.cookie);
  } catch {
    existing = null;
  }
  if (existing) {
    memory.key = existing;
    return { key: existing, isNew: false };
  }
  if (memory.key) return { key: memory.key, isNew: false };
  const key = generateVisitorKey();
  memory.key = key;
  try {
    document.cookie = serializeVisitorCookie(key, { secure: window.location.protocol === 'https:' });
  } catch {
    /* cookies bloqués : l'identifiant ne vit que le temps de la page */
  }
  return { key, isNew: true };
}

/** Source d'un lien balisé (`?utm_source=instagram`), bornée ; seule cette valeur est envoyée, jamais le reste de l'adresse. */
export function utmSourceFromSearch(search: string): string | undefined {
  const value = new URLSearchParams(search).get('utm_source');
  return value ? value.slice(0, TRACK_LIMITS.utm * 2) : undefined;
}

export { ANALYTICS_HEARTBEAT_SECONDS };
