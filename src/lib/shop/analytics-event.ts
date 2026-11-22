import { readConsent } from '@/lib/consent';

// Filtre appliqué à CHAQUE envoi de Vercel Web Analytics (option `beforeSend` de @vercel/analytics :
// renvoyer `null` abandonne l'envoi). Vercel recommande cette méthode pour ne pas transmettre
// d'identifiant de commande ou de recherche libre dans une adresse.

/** Parties du site jamais mesurées : back-office, API, commande et confirmation (cahier §7.6). */
const NEVER_MEASURED_PREFIXES = ['/admin', '/api', '/commande'] as const;

/** Seuls paramètres d'adresse conservés : ceux d'un lien balisé de campagne (cahier §7.6, « lien balisé »). */
const KEPT_QUERY_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign'] as const;
const KEPT_PARAM_MAX_LENGTH = 100;

function isNeverMeasured(pathname: string): boolean {
  return NEVER_MEASURED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Adresse à transmettre : sans fragment ni paramètre (sauf campagne), ou null si la page n'est jamais mesurée.
 * Conserve la forme reçue (adresse absolue ou chemin).
 */
export function sanitizeAnalyticsUrl(raw: string): string | null {
  const absolute = /^https?:\/\//i.test(raw);
  let url: URL;
  try {
    url = new URL(raw, 'http://localhost');
  } catch {
    return null;
  }
  if (isNeverMeasured(url.pathname)) return null;

  const kept = new URLSearchParams();
  for (const key of KEPT_QUERY_PARAMS) {
    const value = url.searchParams.get(key);
    if (value) kept.set(key, value.slice(0, KEPT_PARAM_MAX_LENGTH));
  }
  url.search = kept.toString();
  url.hash = '';
  return absolute ? url.toString() : `${url.pathname}${url.search}`;
}

/**
 * `beforeSend` de Vercel Web Analytics :
 * 1. ceinture et bretelles — le choix est relu à chaque envoi, donc un refus coupe la mesure sans rechargement ;
 * 2. pages jamais mesurées et paramètres d'adresse retirés.
 */
export function beforeSendWithConsent<T extends { url: string }>(event: T): T | null {
  if (readConsent() !== 'granted') return null;
  const url = sanitizeAnalyticsUrl(event.url);
  return url === null ? null : { ...event, url };
}
