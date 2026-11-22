import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_COOKIE_NAMES,
  CONSENT_CHANGE_EVENT,
  CONSENT_COOKIE_DAYS,
  CONSENT_COOKIE_NAME,
  parseConsent,
  readConsentFromCookieHeader,
  serializeConsentCookie,
  serializeCookieDeletion,
} from '@/lib/consent';

describe('fonctions pures du consentement', () => {
  it('ne reconnaît que « granted » et « denied »', () => {
    expect(parseConsent('granted')).toBe('granted');
    expect(parseConsent('denied')).toBe('denied');
    for (const value of ['', 'GRANTED', 'true', '1', 'yes', null, undefined]) expect(parseConsent(value)).toBeNull();
  });

  it('retrouve le choix dans un en-tête Cookie parmi d’autres cookies', () => {
    expect(readConsentFromCookieHeader(`a=1; ${CONSENT_COOKIE_NAME}=granted; b=2`)).toBe('granted');
    expect(readConsentFromCookieHeader(`${CONSENT_COOKIE_NAME}=denied`)).toBe('denied');
  });

  it('ignore un cookie au nom voisin, une valeur inconnue et un en-tête vide', () => {
    expect(readConsentFromCookieHeader(`x${CONSENT_COOKIE_NAME}=granted`)).toBeNull();
    expect(readConsentFromCookieHeader(`${CONSENT_COOKIE_NAME}x=granted`)).toBeNull();
    expect(readConsentFromCookieHeader(`${CONSENT_COOKIE_NAME}=maybe`)).toBeNull();
    expect(readConsentFromCookieHeader('')).toBeNull();
    expect(readConsentFromCookieHeader(null)).toBeNull();
    expect(readConsentFromCookieHeader(undefined)).toBeNull();
    expect(readConsentFromCookieHeader('pas-un-cookie')).toBeNull();
  });

  it('écrit un cookie de 180 jours, lisible par le navigateur et le serveur, sans HttpOnly', () => {
    const cookie = serializeConsentCookie('granted', { secure: false });
    expect(cookie).toContain(`${CONSENT_COOKIE_NAME}=granted`);
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain(`Max-Age=${CONSENT_COOKIE_DAYS * 86400}`);
    expect(CONSENT_COOKIE_DAYS).toBe(180);
    expect(cookie).not.toContain('HttpOnly'); // le navigateur doit pouvoir le lire pour afficher le bon état
    expect(cookie).not.toContain('Secure');
    expect(serializeConsentCookie('denied', { secure: true })).toContain('Secure');
  });

  it('sait effacer un cookie', () => {
    const cookie = serializeCookieDeletion('boutique_vid', { secure: true });
    expect(cookie).toContain('boutique_vid=;');
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('Secure');
  });

  it('relit ce qu’il a écrit (aller-retour)', () => {
    for (const choice of ['granted', 'denied'] as const) {
      const header = serializeConsentCookie(choice, { secure: false }).split(';')[0];
      expect(readConsentFromCookieHeader(header)).toBe(choice);
    }
  });
});

// ---------- Navigateur simulé (le projet teste sans jsdom) ----------

function installBrowser(options: { cookiesBlocked?: boolean; protocol?: string; storage?: Record<string, string> } = {}) {
  const jar = new Map<string, string>();
  const storage = new Map<string, string>(Object.entries(options.storage ?? {}));
  const events = new EventTarget();
  const fakeDocument = {
    get cookie() {
      return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
    },
    set cookie(raw: string) {
      if (options.cookiesBlocked) return;
      const [pair = '', ...attributes] = raw.split(';').map((part) => part.trim());
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (attributes.some((attribute) => attribute === 'Max-Age=0')) jar.delete(name);
      else jar.set(name, value);
    },
    getElementById: () => null,
  };
  const fakeStorage = {
    removeItem: (key: string) => void storage.delete(key),
    getItem: (key: string) => storage.get(key) ?? null,
  };
  vi.stubGlobal('document', fakeDocument);
  vi.stubGlobal('location', { protocol: options.protocol ?? 'https:' });
  vi.stubGlobal('window', {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
    localStorage: fakeStorage,
    sessionStorage: fakeStorage,
  });
  return { jar, storage, events };
}

async function loadConsent() {
  vi.resetModules();
  return import('@/lib/consent');
}

describe('consentement dans le navigateur', () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it('côté serveur : « pending » pour le rendu, « unset » et aucun effet sans navigateur', async () => {
    const consent = await loadConsent();
    expect(consent.getServerConsentSnapshot()).toBe('pending');
    expect(consent.readConsent()).toBeNull();
    expect(consent.getConsentSnapshot()).toBe('unset');
    expect(() => consent.setConsent('granted')).not.toThrow();
    expect(() => consent.clearAnalyticsBrowserData()).not.toThrow();
    expect(consent.subscribeConsent(() => undefined)()).toBeUndefined();
  });

  it('sans choix enregistré : « unset »', async () => {
    installBrowser();
    const consent = await loadConsent();
    expect(consent.getConsentSnapshot()).toBe('unset');
  });

  it('« Accepter » enregistre le cookie, change l’état et prévient les abonnés', async () => {
    const { jar } = installBrowser();
    const consent = await loadConsent();
    const listener = vi.fn();
    const unsubscribe = consent.subscribeConsent(listener);

    consent.setConsent('granted');
    expect(jar.get(CONSENT_COOKIE_NAME)).toBe('granted');
    expect(consent.getConsentSnapshot()).toBe('granted');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    consent.setConsent('denied');
    expect(listener).toHaveBeenCalledTimes(1); // désabonné : plus d'appel
    expect(consent.getConsentSnapshot()).toBe('denied');
  });

  it('« Refuser » efface les identifiants d’analytique du navigateur, mais pas le panier', async () => {
    const { jar, storage } = installBrowser({ storage: { boutique_vid: 'abc', 'boutique.cart.v1': '{"lines":[]}' } });
    jar.set('boutique_vid', 'abc');
    const consent = await loadConsent();

    consent.setConsent('denied');

    for (const name of ANALYTICS_COOKIE_NAMES) expect(jar.has(name)).toBe(false);
    expect(storage.has('boutique_vid')).toBe(false);
    expect(storage.get('boutique.cart.v1')).toBe('{"lines":[]}');
    expect(jar.get(CONSENT_COOKIE_NAME)).toBe('denied');
  });

  it('« Accepter » n’efface rien', async () => {
    const { jar } = installBrowser();
    jar.set('boutique_vid', 'abc');
    const consent = await loadConsent();
    consent.setConsent('granted');
    expect(jar.get('boutique_vid')).toBe('abc');
  });

  it('cookies bloqués : le choix tient pour la page ouverte, la bannière ne réapparaît pas', async () => {
    installBrowser({ cookiesBlocked: true });
    const consent = await loadConsent();
    consent.setConsent('denied');
    expect(consent.getConsentSnapshot()).toBe('denied');
  });

  it('cookie présent : il l’emporte sur la mémoire de la page', async () => {
    const { jar } = installBrowser();
    const consent = await loadConsent();
    consent.setConsent('granted');
    jar.set(CONSENT_COOKIE_NAME, 'denied'); // changé depuis un autre onglet
    expect(consent.getConsentSnapshot()).toBe('denied');
  });

  it('retrouve le choix d’un autre onglet au retour sur la page (événement « focus »)', async () => {
    const { events } = installBrowser();
    const consent = await loadConsent();
    const listener = vi.fn();
    const unsubscribe = consent.subscribeConsent(listener);
    events.dispatchEvent(new Event('focus'));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    events.dispatchEvent(new Event('focus'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('marque le cookie « Secure » seulement sur une page https', async () => {
    const written: string[] = [];
    installBrowser({ protocol: 'http:' });
    const spy = vi.spyOn(document as unknown as { cookie: string }, 'cookie', 'set').mockImplementation((value) => void written.push(value));
    const consent = await loadConsent();
    consent.setConsent('granted');
    expect(written[0]).not.toContain('Secure');
    spy.mockRestore();
    expect(CONSENT_CHANGE_EVENT).toBe('boutique:consent-change');
  });
});
