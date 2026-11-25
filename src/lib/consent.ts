// Consentement à la mesure d'audience (cahier P-44, D-17, D-22).
//
// Le choix est mémorisé dans un cookie PROPRE au site (aucun service tiers), lisible côté navigateur
// ET côté serveur : l'analytique maison (étape 10) pourra donc refuser tout envoi sans consentement.
// Ce module est isomorphe : les fonctions pures (parse / serialize) servent partout ; les fonctions
// « navigateur » ne font rien quand `document` n'existe pas (rendu serveur, tests).

export const CONSENT_COOKIE_NAME = 'boutique_consent';
/** Durée de mémorisation du choix 🟡 (à valider avec la cliente et le professionnel, cahier P-44). */
export const CONSENT_COOKIE_DAYS = 180;
export const CONSENT_CHANGE_EVENT = 'boutique:consent-change';

export type ConsentChoice = 'granted' | 'denied';
/**
 * - `pending` : rendu serveur / hydratation en cours — on ne sait pas encore (on n'affiche rien, on ne mesure rien) ;
 * - `unset`   : aucun choix enregistré — la bannière s'affiche, rien n'est mesuré ;
 * - `granted` / `denied` : choix enregistré.
 */
export type ConsentState = 'pending' | 'unset' | ConsentChoice;

/**
 * Identifiants de l'analytique maison dans le navigateur, effacés au refus (étape 10).
 * 🟡 Le nom définitif est fixé à la construction de l'étape 10 : la liste est ici pour que « Refuser » les
 * efface dès qu'ils existent. Vercel Web Analytics ne pose pas de cookie : rien à effacer pour lui.
 */
export const ANALYTICS_COOKIE_NAMES = ['boutique_vid'] as const;
/** `boutique_arrival` : repère de l'onglet (sessionStorage) indiquant que l'arrivée a déjà été signalée. */
export const ANALYTICS_STORAGE_KEYS = ['boutique_vid', 'boutique_arrival'] as const;

// ---------- Fonctions pures ----------

export function parseConsent(value: string | null | undefined): ConsentChoice | null {
  return value === 'granted' || value === 'denied' ? value : null;
}

/** Lit le choix dans un en-tête `Cookie` (navigateur : `document.cookie` ; serveur : `request.headers`). */
export function readConsentFromCookieHeader(header: string | null | undefined): ConsentChoice | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== CONSENT_COOKIE_NAME) continue;
    return parseConsent(part.slice(separator + 1).trim());
  }
  return null;
}

export function serializeConsentCookie(choice: ConsentChoice, options: { secure: boolean }): string {
  const attributes = [
    `${CONSENT_COOKIE_NAME}=${choice}`,
    'Path=/',
    `Max-Age=${CONSENT_COOKIE_DAYS * 24 * 60 * 60}`,
    'SameSite=Lax',
  ];
  if (options.secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function serializeCookieDeletion(name: string, options: { secure: boolean }): string {
  const attributes = [`${name}=`, 'Path=/', 'Max-Age=0', 'SameSite=Lax'];
  if (options.secure) attributes.push('Secure');
  return attributes.join('; ');
}

// ---------- Navigateur ----------

// Si le navigateur refuse d'enregistrer le cookie (cookies bloqués), le choix vaut pour la page ouverte :
// sans cela, la bannière réapparaîtrait aussitôt après « Refuser ».
let memoryChoice: ConsentChoice | null = null;

function isSecurePage(): boolean {
  return typeof location !== 'undefined' && location.protocol === 'https:';
}

/** Choix actuel (null = aucun). Ne lève jamais. */
export function readConsent(): ConsentChoice | null {
  if (typeof document === 'undefined') return null;
  try {
    return readConsentFromCookieHeader(document.cookie) ?? memoryChoice;
  } catch {
    return memoryChoice;
  }
}

export function getConsentSnapshot(): ConsentState {
  return readConsent() ?? 'unset';
}

/** Rendu serveur et hydratation : « pending », pour que le HTML statique soit identique pour tous. */
export function getServerConsentSnapshot(): ConsentState {
  return 'pending';
}

/** Abonnement pour `useSyncExternalStore` : changement dans cet onglet, ou dans un autre (au retour sur l'onglet). */
export function subscribeConsent(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  window.addEventListener('focus', onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
    window.removeEventListener('focus', onChange);
  };
}

/** Identifiant du visiteur posé par l'analytique maison, s'il existe dans ce navigateur. */
function readVisitorCookie(): string | null {
  try {
    const match = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${ANALYTICS_COOKIE_NAMES[0]}=`));
    return match ? decodeURIComponent(match.slice(ANALYTICS_COOKIE_NAMES[0].length + 1)) : null;
  } catch {
    return null;
  }
}

/**
 * Au refus, demande aussi au serveur d'effacer ce qu'il a enregistré pour CE navigateur (visite et événements). À
 * appeler AVANT la suppression du cookie : c'est lui qui porte l'identifiant. Jamais bloquant, jamais d'erreur visible.
 */
function requestServerErasure(): void {
  const visitorKey = readVisitorCookie();
  if (!visitorKey || typeof fetch !== 'function') return;
  try {
    void fetch('/api/v1/track/forget', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitorKey }) }).catch(() => undefined);
  } catch {
    /* l'effacement dans le navigateur a lieu quand même */
  }
}

/** Efface ce que l'analytique maison a pu enregistrer dans ce navigateur (appelé au refus). */
export function clearAnalyticsBrowserData(): void {
  if (typeof document === 'undefined') return;
  const secure = isSecurePage();
  try {
    for (const name of ANALYTICS_COOKIE_NAMES) document.cookie = serializeCookieDeletion(name, { secure });
  } catch {
    /* cookies indisponibles : rien à effacer */
  }
  for (const storage of ['localStorage', 'sessionStorage'] as const) {
    try {
      for (const key of ANALYTICS_STORAGE_KEYS) window[storage].removeItem(key);
    } catch {
      /* stockage indisponible */
    }
  }
}

/** Enregistre le choix. « Refuser » efface aussi ce qui concerne ce navigateur (cahier P-44). */
export function setConsent(choice: ConsentChoice): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = serializeConsentCookie(choice, { secure: isSecurePage() });
  } catch {
    /* cookies bloqués : on retombe sur la mémoire de la page */
  }
  let stored: ConsentChoice | null = null;
  try {
    stored = readConsentFromCookieHeader(document.cookie);
  } catch {
    stored = null;
  }
  memoryChoice = stored === choice ? null : choice;
  if (choice === 'denied') {
    requestServerErasure();
    clearAnalyticsBrowserData();
  }
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}
