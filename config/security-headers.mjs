// En-têtes de sécurité HTTP : une seule source, lue par next.config.mjs ET par les tests (tests/unit/csp.test.ts).
// Fichier .mjs (et non .ts) parce que next.config.mjs ne sait pas importer du TypeScript.
//
// Content-Security-Policy (cahier §10.2) : tout ce que le navigateur peut charger ou contacter est listé ici.
//  - Cloudinary : `res.cloudinary.com` (photos en img-src, vidéos et sons en media-src), `api.cloudinary.com` (envoi
//    direct depuis le back-office, T-04).
//  - OpenStreetMap : `tile.openstreetmap.org`, UNIQUEMENT sur /admin (carte des visiteurs, étape 10) : le site public
//    n'en a pas besoin, donc il ne l'autorise pas.
//  - Vercel Web Analytics (D-22) : son script et ses envois passent par /_vercel/insights/* (même origine), donc
//    couverts par 'self'. En développement seulement, `@vercel/analytics` charge un script de debug sur
//    va.vercel-scripts.com : autorisé hors production uniquement.
//  - `blob:` et `data:` en img-src : l'aperçu du ticket de commande est un Blob (ReceiptPrinter), le téléchargement
//    du PNG aussi.
//  - 'unsafe-inline' (scripts) : Next.js 14 injecte de petits scripts en ligne pour l'hydratation. Les remplacer par
//    des nonces obligerait à rendre TOUTES les pages dynamiques (fin de la génération statique, donc de la rapidité
//    du site). Ce n'est pas un bon échange ici : la politique reste utile pour tout le reste (origines des images,
//    connexions, formulaires, cadres, <base>, <object>). 'unsafe-inline' (styles) : les couleurs de section sont
//    posées en attribut style.
//  - Aucun joker (*) : chaque origine est nommée.

const CLOUDINARY_IMAGES = 'https://res.cloudinary.com';
const CLOUDINARY_UPLOAD = 'https://api.cloudinary.com';
const OSM_TILES = 'https://tile.openstreetmap.org';
const VERCEL_ANALYTICS_DEBUG = 'https://va.vercel-scripts.com';

/**
 * @param {{ isDev?: boolean, allowMapTiles?: boolean }} [options]
 *   isDev : ajoute ce que `next dev` exige (eval, rechargement à chaud) ;
 *   allowMapTiles : autorise les tuiles OpenStreetMap (back-office seulement).
 * @returns {string} la valeur de l'en-tête Content-Security-Policy
 */
export function buildCsp({ isDev = false, allowMapTiles = false } = {}) {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'", VERCEL_ANALYTICS_DEBUG] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', CLOUDINARY_IMAGES, ...(allowMapTiles ? [OSM_TILES] : [])],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", CLOUDINARY_UPLOAD, ...(isDev ? ['ws://localhost:*', 'http://localhost:*', VERCEL_ANALYTICS_DEBUG] : [])],
    'media-src': ["'self'", CLOUDINARY_IMAGES],
    'manifest-src': ["'self'"],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  const parts = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`);
  // Force https pour tout sous-ressource ; inutile (et gênant) en développement local en http.
  if (!isDev) parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}

/** En-têtes sans rapport avec la CSP (déjà en place avant la v0.8.1). */
export const baseSecurityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/**
 * Règles pour `headers()` de next.config.mjs.
 * `reportOnly` : la politique est seulement SIGNALÉE dans la console du navigateur (rien n'est bloqué) ; utile pour
 * observer une première mise en ligne (variable CSP_REPORT_ONLY=1).
 *
 * Deux règles qui ne se recouvrent jamais : /admin (avec les tuiles de carte) et tout le reste (sans). Si elles se
 * recouvraient, la seconde écraserait la première.
 *
 * @param {{ isDev?: boolean, reportOnly?: boolean }} [options]
 */
export function buildHeaderRules({ isDev = false, reportOnly = false } = {}) {
  const name = reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  return [
    { source: '/admin/:path*', headers: [...baseSecurityHeaders, { key: name, value: buildCsp({ isDev, allowMapTiles: true }) }] },
    { source: '/:path((?!admin(?:/|$)).*)', headers: [...baseSecurityHeaders, { key: name, value: buildCsp({ isDev, allowMapTiles: false }) }] },
  ];
}
