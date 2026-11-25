import { NEVER_TRACKED_PREFIXES, TRACK_LIMITS } from '@/lib/analytics/events';

// Fonctions PURES qui transforment ce que le navigateur et l'hébergeur envoient en données grossières (cahier §7.6).
// L'adresse IP et le user-agent brut ne passent jamais par ici vers la base : seuls le résultat de ces fonctions
// (pays, région, ville approximatifs ; type d'appareil ; navigateur ; provenance) est enregistré.

// ---------------------------------------------------------------------------
// Robots
// ---------------------------------------------------------------------------

const BOT_PATTERN = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp\/|curl|wget|python-requests|httpclient|monitor|uptime/i;

/** Les robots sont ignorés (cahier §7.6). Un user-agent absent est traité comme un robot. */
export function isBot(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

// ---------------------------------------------------------------------------
// Appareil et navigateur
// ---------------------------------------------------------------------------

export interface DeviceInfo {
  /** « mobile », « tablette » ou « ordinateur ». */
  device: string;
  /** « Chrome (Android) », « Instagram (iOS) »… Pas de version : le user-agent brut n'est pas conservé. */
  browser: string;
  /** Navigateur intégré d'un réseau social : donne une provenance quand le référent est absent. */
  inAppSource: 'instagram' | 'facebook' | 'tiktok' | null;
}

function detectOs(ua: string): string | null {
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Linux|X11/i.test(ua)) return 'Linux';
  return null;
}

export function parseUserAgent(userAgent: string | null | undefined): DeviceInfo {
  const ua = userAgent ?? '';
  const tablet = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const mobile = /Mobi|iPhone|iPod|Android/i.test(ua);
  const device = tablet ? 'tablette' : mobile ? 'mobile' : 'ordinateur';

  let name = 'Autre';
  let inAppSource: DeviceInfo['inAppSource'] = null;
  if (/Instagram/i.test(ua)) {
    name = 'Instagram';
    inAppSource = 'instagram';
  } else if (/FBAN|FBAV|FB_IAB/i.test(ua)) {
    name = 'Facebook';
    inAppSource = 'facebook';
  } else if (/musical_ly|TikTok|BytedanceWebview|Bytedance/i.test(ua)) {
    name = 'TikTok';
    inAppSource = 'tiktok';
  } else if (/Edg(e|A|iOS)?\//i.test(ua)) name = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) name = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) name = 'Samsung Internet';
  else if (/Firefox|FxiOS/i.test(ua)) name = 'Firefox';
  else if (/Chrome|CriOS|Chromium/i.test(ua)) name = 'Chrome';
  else if (/Safari/i.test(ua)) name = 'Safari';

  const os = detectOs(ua);
  return { device, browser: os ? `${name} (${os})` : name, inAppSource };
}

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

const UTM_ALIASES: Record<string, string> = { ig: 'instagram', insta: 'instagram', fb: 'facebook', wa: 'whatsapp', tt: 'tiktok', gg: 'google' };

const cleanSlug = (value: string, max: number): string => value.toLowerCase().replace(/[^a-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max);

/** « l.instagram.com » → « instagram.com » ; retire « www. » et les sous-domaines de redirection courants. */
function baseHost(host: string): string {
  return host.toLowerCase().replace(/^(www|m|l|lm|mobile|web)\./, '');
}

function fromHost(host: string): string {
  const base = baseHost(host);
  if (/(^|\.)google\.[a-z.]+$/.test(base) || base === 'g.co') return 'google';
  if (/(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|qwant\.com)$/.test(base)) return `moteur:${base}`;
  if (/(^|\.)instagram\.com$/.test(base)) return 'instagram';
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/.test(base)) return 'facebook';
  if (/(^|\.)tiktok\.com$/.test(base)) return 'tiktok';
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(base)) return 'whatsapp';
  return `site:${base.slice(0, TRACK_LIMITS.referrerHost)}`;
}

/** Domaine d'un référent, ou null (absent, illisible, ou du site lui-même). */
export function referrerHost(referrer: string | null | undefined, selfHost: string | null | undefined): string | null {
  if (!referrer) return null;
  let host: string;
  try {
    host = new URL(referrer).hostname;
  } catch {
    return null;
  }
  if (!host) return null;
  if (selfHost && baseHost(host) === baseHost(selfHost.split(':')[0] ?? selfHost)) return null;
  return host;
}

/**
 * Provenance d'une visite : un lien balisé (`utm_source`) l'emporte sur le référent ; le navigateur intégré d'Instagram,
 * Facebook ou TikTok (qui n'envoient souvent aucun référent) vient ensuite ; sinon « direct ». Un partage WhatsApp
 * n'envoie aucun référent : d'où le lien balisé.
 */
export function classifySource(input: { utmSource?: string | null; referrerHost?: string | null; inApp?: DeviceInfo['inAppSource'] }): string {
  const utm = input.utmSource ? cleanSlug(input.utmSource, TRACK_LIMITS.utm) : '';
  if (utm) return UTM_ALIASES[utm] ?? utm;
  if (input.referrerHost) return fromHost(input.referrerHost);
  return input.inApp ?? 'direct';
}

const SOURCE_LABELS: Record<string, string> = {
  direct: 'Accès direct',
  google: 'Google',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
};

/** Libellé lisible d'une provenance enregistrée. */
export function sourceLabel(source: string | null | undefined): string {
  if (!source) return 'Accès direct';
  const known = SOURCE_LABELS[source];
  if (known) return known;
  if (source.startsWith('site:')) return `Site : ${source.slice(5)}`;
  if (source.startsWith('moteur:')) return `Moteur de recherche : ${source.slice(7)}`;
  return `Lien balisé : ${source}`;
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

const SAFE_PATH = /^\/[A-Za-z0-9/_\-.%~]*$/;

/**
 * Chemin à enregistrer : sans paramètre ni fragment, jamais le back-office, l'API, la commande ni la confirmation
 * (la référence de commande est dans l'adresse de la confirmation). null = page jamais mesurée.
 */
export function sanitizeTrackPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const withoutQuery = raw.split(/[?#]/)[0] ?? '';
  if (withoutQuery.length === 0 || withoutQuery.length > TRACK_LIMITS.path || !SAFE_PATH.test(withoutQuery)) return null;
  const path = withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, '') || '/' : withoutQuery;
  if (NEVER_TRACKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null;
  return path;
}

// ---------------------------------------------------------------------------
// Géographie approximative (en-têtes de l'hébergeur ; l'adresse IP n'est jamais lue ici)
// ---------------------------------------------------------------------------

export interface GeoInfo {
  country: string | null;
  region: string | null;
  city: string | null;
}

const CI_REGIONS: Record<string, string> = {
  AB: 'Abidjan',
  BS: 'Bas-Sassandra',
  CM: 'Comoé',
  DN: 'Denguélé',
  GD: 'Gôh-Djiboua',
  LC: 'Lacs',
  LG: 'Lagunes',
  MG: 'Montagnes',
  SM: 'Sassandra-Marahoué',
  SV: 'Savanes',
  VB: 'Vallée du Bandama',
  WR: 'Woroba',
  YM: 'Yamoussoukro',
  ZZ: 'Zanzan',
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const cleanPlace = (value: string | null | undefined, max: number): string | null => {
  if (!value) return null;
  const text = safeDecode(value).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
  return text || null;
};

/** Nom français d'un pays à partir de son code ISO (« CI » → « Côte d’Ivoire »). */
export function countryName(code: string | null | undefined): string | null {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  try {
    return new Intl.DisplayNames(['fr'], { type: 'region' }).of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** Pays, région et ville approximatifs depuis les en-têtes de l'hébergeur. « Inconnu » = champs à null (local, hors Vercel). */
export function geoFromHeaders(headers: Pick<Headers, 'get'>): GeoInfo {
  const code = headers.get('x-vercel-ip-country')?.trim().toUpperCase() || null;
  const regionCode = cleanPlace(headers.get('x-vercel-ip-country-region'), 40);
  const region = code === 'CI' && regionCode ? (CI_REGIONS[regionCode.toUpperCase()] ?? regionCode) : regionCode;
  return { country: countryName(code), region, city: cleanPlace(headers.get('x-vercel-ip-city'), 80) };
}

/** « Abidjan, Côte d’Ivoire » : les éléments connus seulement. */
export function formatGeo(geo: GeoInfo): string {
  return [geo.city, geo.region && geo.region !== geo.city ? geo.region : null, geo.country].filter(Boolean).join(', ') || 'Zone inconnue';
}

/** « Abidjan, Côte d’Ivoire » → pour l'objet de l'email : province (ou ville) et pays. */
export function subjectPlace(geo: GeoInfo): string {
  return [geo.region ?? geo.city, geo.country].filter(Boolean).join(', ') || 'zone inconnue';
}

// ---------------------------------------------------------------------------
// Durées et heure
// ---------------------------------------------------------------------------

/** 75 → « 1 min 15 s » ; 3 725 → « 1 h 02 min ». */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${String(rest).padStart(2, '0')} s`;
}

/** Heure d'Abidjan (UTC+0, sans changement d'heure), pour l'alerte et l'onglet Analytics. */
export function formatAbidjanDateTime(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Abidjan' }).format(date);
}
