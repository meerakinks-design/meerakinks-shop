import { describe, expect, it } from 'vitest';
import { countByDay, dayKeys, buildFunnel, parsePeriod, percent, periodStart, tally, average } from '@/lib/analytics/aggregate';
import { classifySource, formatDuration, formatGeo, geoFromHeaders, isBot, parseUserAgent, referrerHost, sanitizeTrackPath, sourceLabel, subjectPlace } from '@/lib/analytics/classify';
import { generateVisitorKey, readVisitorKeyFromCookieHeader, serializeVisitorCookie } from '@/lib/analytics/client';
import { NEVER_TRACKED_PREFIXES, TRACK_TARGETS, VISITOR_COOKIE_NAME, VISITOR_KEY_PATTERN, isTrackTarget } from '@/lib/analytics/events';
import { ANALYTICS_COOKIE_NAMES } from '@/lib/consent';
import { trackBodySchema } from '@/lib/validation/track.schema';

const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name.toLowerCase()] ?? null });
const KEY = 'a'.repeat(32);

describe('liste fermée des événements', () => {
  it('le cookie de visiteur porte le nom déclaré au consentement (il est effacé au refus)', () => {
    expect(ANALYTICS_COOKIE_NAMES).toContain(VISITOR_COOKIE_NAME);
  });

  it('reconnaît uniquement les identifiants de bouton listés', () => {
    expect(isTrackTarget('product_add')).toBe(true);
    expect(isTrackTarget('mot-de-passe')).toBe(false);
    expect(isTrackTarget(undefined)).toBe(false);
    expect(new Set(TRACK_TARGETS).size).toBe(TRACK_TARGETS.length);
  });

  it('refuse un clic sans identifiant listé, une clé inconnue et un identifiant de visiteur invalide', () => {
    expect(trackBodySchema.safeParse({ visitorKey: KEY, type: 'click', target: 'inconnu' }).success).toBe(false);
    expect(trackBodySchema.safeParse({ visitorKey: KEY, type: 'click', target: 'product_add' }).success).toBe(true);
    expect(trackBodySchema.safeParse({ visitorKey: KEY, type: 'page_view', path: '/', email: 'a@b.c' }).success).toBe(false);
    expect(trackBodySchema.safeParse({ visitorKey: 'court', type: 'heartbeat' }).success).toBe(false);
    expect(trackBodySchema.safeParse({ visitorKey: KEY, type: 'page_view' }).success).toBe(false);
    expect(trackBodySchema.safeParse({ visitorKey: KEY, type: 'heartbeat', seconds: 400 }).success).toBe(false);
    expect(trackBodySchema.safeParse({ visitorKey: KEY, type: 'rien' }).success).toBe(false);
  });
});

describe('pages mesurées', () => {
  it('garde le chemin sans paramètre ni fragment', () => {
    expect(sanitizeTrackPath('/produit/serum?utm_source=ig#avis')).toBe('/produit/serum');
    expect(sanitizeTrackPath('/')).toBe('/');
    expect(sanitizeTrackPath('/cgv/')).toBe('/cgv');
  });

  it('ne mesure jamais le back-office, l’API, la commande ni la confirmation', () => {
    for (const prefix of NEVER_TRACKED_PREFIXES) {
      expect(sanitizeTrackPath(prefix)).toBeNull();
      expect(sanitizeTrackPath(`${prefix}/x`)).toBeNull();
    }
    expect(sanitizeTrackPath('/commande/confirmation?ref=CMD-ABCD')).toBeNull();
    expect(sanitizeTrackPath('/administration')).toBe('/administration');
  });

  it('refuse un chemin illisible ou trop long', () => {
    expect(sanitizeTrackPath('produit')).toBeNull();
    expect(sanitizeTrackPath('/<script>')).toBeNull();
    expect(sanitizeTrackPath(`/${'a'.repeat(300)}`)).toBeNull();
    expect(sanitizeTrackPath(42)).toBeNull();
  });
});

describe('robots, appareil, navigateur', () => {
  it('ignore les robots et l’absence de user-agent', () => {
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isBot('HeadlessChrome/120')).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')).toBe(false);
  });

  it('distingue mobile, tablette et ordinateur, sans conserver de version', () => {
    expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36')).toMatchObject({ device: 'mobile', browser: 'Chrome (Android)' });
    expect(parseUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1')).toMatchObject({ device: 'tablette', browser: 'Safari (iOS)' });
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0')).toMatchObject({ device: 'ordinateur', browser: 'Edge (Windows)' });
    expect(parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Gecko/20100101 Firefox/121.0').browser).toBe('Firefox (macOS)');
  });

  it('reconnaît les navigateurs intégrés des réseaux sociaux, qui n’envoient souvent aucun référent', () => {
    const insta = parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0.0');
    expect(insta.inAppSource).toBe('instagram');
    expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13) Mobile [FBAN/FB4A;FBAV/400.0]').inAppSource).toBe('facebook');
    expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13) Mobile musical_ly_30.0 TikTok').inAppSource).toBe('tiktok');
  });
});

describe('provenance', () => {
  it('un lien balisé l’emporte sur le référent, avec les raccourcis courants', () => {
    expect(classifySource({ utmSource: 'IG', referrerHost: 'google.com' })).toBe('instagram');
    expect(classifySource({ utmSource: 'Newsletter Noël!' })).toBe('newsletter-no-l');
    expect(classifySource({ utmSource: 'wa' })).toBe('whatsapp');
  });

  it('classe les référents connus, les autres sites et l’accès direct', () => {
    expect(classifySource({ referrerHost: 'www.google.ci' })).toBe('google');
    expect(classifySource({ referrerHost: 'l.instagram.com' })).toBe('instagram');
    expect(classifySource({ referrerHost: 'm.facebook.com' })).toBe('facebook');
    expect(classifySource({ referrerHost: 'blog.exemple.com' })).toBe('site:blog.exemple.com');
    expect(classifySource({})).toBe('direct');
    expect(classifySource({ inApp: 'tiktok' })).toBe('tiktok');
  });

  it('un référent du site lui-même n’est pas une provenance', () => {
    expect(referrerHost('https://www.meerakinks.com/produit/x', 'meerakinks.com')).toBeNull();
    expect(referrerHost('https://l.instagram.com/?u=x', 'meerakinks.com:443')).toBe('l.instagram.com');
    expect(referrerHost('pas une adresse', 'meerakinks.com')).toBeNull();
    expect(referrerHost(undefined, 'meerakinks.com')).toBeNull();
  });

  it('donne un libellé lisible', () => {
    expect(sourceLabel('direct')).toBe('Accès direct');
    expect(sourceLabel('instagram')).toBe('Instagram');
    expect(sourceLabel('site:blog.exemple.com')).toBe('Site : blog.exemple.com');
    expect(sourceLabel('lancement')).toBe('Lien balisé : lancement');
    expect(sourceLabel(null)).toBe('Accès direct');
  });
});

describe('géographie approximative', () => {
  it('lit les en-têtes de l’hébergeur et nomme le pays en français', () => {
    const geo = geoFromHeaders(headers({ 'x-vercel-ip-country': 'CI', 'x-vercel-ip-country-region': 'AB', 'x-vercel-ip-city': 'Abidjan' }));
    expect(geo).toEqual({ country: 'Côte d’Ivoire', region: 'Abidjan', city: 'Abidjan' });
    expect(formatGeo(geo)).toBe('Abidjan, Côte d’Ivoire');
    expect(subjectPlace(geo)).toBe('Abidjan, Côte d’Ivoire');
  });

  it('décode une ville encodée et garde le code de région hors Côte d’Ivoire', () => {
    const geo = geoFromHeaders(headers({ 'x-vercel-ip-country': 'FR', 'x-vercel-ip-country-region': 'IDF', 'x-vercel-ip-city': 'Saint-%C3%89tienne' }));
    expect(geo).toMatchObject({ country: 'France', region: 'IDF', city: 'Saint-Étienne' });
  });

  it('sans en-têtes (hors hébergeur), tout est inconnu : jamais de valeur inventée', () => {
    const geo = geoFromHeaders(headers({}));
    expect(geo).toEqual({ country: null, region: null, city: null });
    expect(formatGeo(geo)).toBe('Zone inconnue');
    expect(subjectPlace(geo)).toBe('zone inconnue');
  });

  it('neutralise un code pays ou une ville mal formés', () => {
    expect(geoFromHeaders(headers({ 'x-vercel-ip-country': '<<', 'x-vercel-ip-city': '<b>x</b>' }))).toMatchObject({ country: null, city: 'bx/b' });
  });
});

describe('durées', () => {
  it('formate les durées', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(120)).toBe('2 min');
    expect(formatDuration(75)).toBe('1 min 15 s');
    expect(formatDuration(3725)).toBe('1 h 02 min');
    expect(formatDuration(-5)).toBe('0 s');
  });
});

describe('identifiant de visiteur (navigateur)', () => {
  it('crée 128 bits en hexadécimal, accepté par le serveur', () => {
    const key = generateVisitorKey((bytes) => bytes.forEach((_, index) => (bytes[index] = index * 17)));
    expect(key).toHaveLength(32);
    expect(VISITOR_KEY_PATTERN.test(key)).toBe(true);
    expect(VISITOR_KEY_PATTERN.test(generateVisitorKey())).toBe(true);
  });

  it('relit l’identifiant depuis le cookie et ignore une valeur invalide', () => {
    expect(readVisitorKeyFromCookieHeader(`autre=1; ${VISITOR_COOKIE_NAME}=${KEY}`)).toBe(KEY);
    expect(readVisitorKeyFromCookieHeader(`${VISITOR_COOKIE_NAME}=n-importe-quoi`)).toBeNull();
    expect(readVisitorKeyFromCookieHeader(null)).toBeNull();
  });

  it('le cookie dure 90 jours, SameSite=Lax, « Secure » seulement en https', () => {
    const cookie = serializeVisitorCookie(KEY, { secure: true });
    expect(cookie).toContain('Max-Age=7776000');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(serializeVisitorCookie(KEY, { secure: false })).not.toContain('Secure');
  });
});

describe('calculs de l’onglet Analytics', () => {
  const NOW = new Date('2026-11-23T15:30:00Z');

  it('découpe la période en jours d’Abidjan, jour courant inclus', () => {
    const start = periodStart(NOW, 7);
    expect(start.toISOString()).toBe('2026-11-17T00:00:00.000Z');
    expect(dayKeys(start, 7)).toEqual(['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23']);
  });

  it('compte par jour et ignore ce qui est hors période', () => {
    const keys = dayKeys(periodStart(NOW, 3), 3);
    const counts = countByDay([new Date('2026-11-23T01:00:00Z'), new Date('2026-11-23T23:00:00Z'), new Date('2026-11-21T10:00:00Z'), new Date('2026-10-01T10:00:00Z')], keys);
    expect(counts).toEqual([{ day: '2026-11-21', count: 1 }, { day: '2026-11-22', count: 0 }, { day: '2026-11-23', count: 2 }]);
  });

  it('classe, regroupe les valeurs vides et borne', () => {
    expect(tally(['a', 'b', 'a', null, ''], { fallback: 'Inconnu' })).toEqual([{ label: 'a', count: 2 }, { label: 'Inconnu', count: 2 }, { label: 'b', count: 1 }]);
    expect(tally(['a', 'b', 'c'], { limit: 2 })).toHaveLength(2);
    expect(tally([null])).toEqual([]);
  });

  it('moyenne et pourcentages ne divisent jamais par zéro', () => {
    expect(average([])).toBeNull();
    expect(average([10, 20, 31])).toBe(20);
    expect(percent(1, 0)).toBeNull();
    expect(percent(1, 3)).toBe(33);
  });

  it('l’entonnoir compare chaque étape à la précédente', () => {
    const funnel = buildFunnel([{ key: 'a', label: 'A', visitors: 100 }, { key: 'b', label: 'B', visitors: 25 }, { key: 'c', label: 'C', visitors: 0 }]);
    expect(funnel.map((step) => step.fromPrevious)).toEqual([null, 25, 0]);
  });

  it('retombe sur 30 jours pour une période non prévue', () => {
    expect(parsePeriod('7')).toBe(7);
    expect(parsePeriod(['90'])).toBe(90);
    expect(parsePeriod('15')).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
  });
});
