import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { baseSecurityHeaders, buildCsp, buildHeaderRules } from '../../config/security-headers.mjs';

// Le même moteur de motifs que Next.js applique à `headers()` : on teste le vrai comportement, pas une copie.
const { pathToRegexp } = createRequire(import.meta.url)('next/dist/compiled/path-to-regexp') as {
  pathToRegexp: (source: string) => RegExp;
};

const directives = (policy: string) =>
  Object.fromEntries(
    policy.split('; ').map((part) => {
      const [name, ...values] = part.split(' ');
      return [name, values];
    }),
  ) as Record<string, string[]>;

describe('Content-Security-Policy (production)', () => {
  const csp = directives(buildCsp());

  it('n’autorise par défaut que le site lui-même', () => {
    expect(csp['default-src']).toEqual(["'self'"]);
  });

  it('autorise Cloudinary : api pour l’envoi, res pour l’affichage des photos (cahier §10.2)', () => {
    expect(csp['connect-src']).toContain('https://api.cloudinary.com');
    expect(csp['img-src']).toContain('https://res.cloudinary.com');
    // L'envoi ne passe jamais par res., et l'affichage jamais par api. : chaque origine a un seul rôle.
    expect(csp['img-src']).not.toContain('https://api.cloudinary.com');
    expect(csp['connect-src']).not.toContain('https://res.cloudinary.com');
  });

  it('autorise la lecture des vidéos et des sons hébergés chez Cloudinary (media-src), et lui seul', () => {
    expect(csp['media-src']).toEqual(["'self'", 'https://res.cloudinary.com']);
  });

  it('autorise l’aperçu du ticket de commande (Blob) et les images en ligne', () => {
    expect(csp['img-src']).toEqual(expect.arrayContaining(["'self'", 'blob:', 'data:']));
  });

  it('autorise les textures blob: de la scène 3D (GLB servis en local)', () => {
    expect(csp['connect-src']).toContain('blob:');
  });

  it('couvre Vercel Web Analytics par la même origine (/_vercel/insights), sans ouvrir d’autre domaine', () => {
    expect(csp['script-src']).toContain("'self'");
    expect(csp['connect-src']).toContain("'self'");
    expect(buildCsp()).not.toContain('vercel-scripts.com');
  });

  it('interdit les tuiles de carte sur le site public', () => {
    expect(buildCsp()).not.toContain('openstreetmap');
  });

  it('verrouille objets, cadres, <base> et formulaires', () => {
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['frame-src']).toEqual(["'none'"]);
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(csp['base-uri']).toEqual(["'self'"]);
    expect(csp['form-action']).toEqual(["'self'"]);
  });

  it('n’autorise jamais eval en production et ne contient aucun joker', () => {
    expect(buildCsp()).not.toContain("'unsafe-eval'");
    for (const values of Object.values(csp)) expect(values).not.toContain('*');
    expect(buildCsp()).not.toMatch(/https:\/\/\*|\s\*(\s|;|$)/);
  });

  it('force https pour les sous-ressources', () => {
    expect(Object.keys(csp)).toContain('upgrade-insecure-requests');
  });

  it('chaque directive a au moins une valeur (sauf upgrade-insecure-requests) : pas d’entrée vide', () => {
    for (const [name, values] of Object.entries(csp)) {
      if (name === 'upgrade-insecure-requests') continue;
      expect(values.length, name).toBeGreaterThan(0);
    }
  });
});

describe('Content-Security-Policy (back-office et développement)', () => {
  it('autorise les tuiles OpenStreetMap, et seulement elles, pour la carte des visiteurs', () => {
    const csp = directives(buildCsp({ allowMapTiles: true }));
    expect(csp['img-src']).toContain('https://tile.openstreetmap.org');
    expect(buildCsp({ allowMapTiles: true })).not.toMatch(/\*\.tile/);
  });

  it('en développement : eval, rechargement à chaud et script de debug de Vercel Analytics, pas d’upgrade https', () => {
    const csp = directives(buildCsp({ isDev: true }));
    expect(csp['script-src']).toEqual(expect.arrayContaining(["'unsafe-eval'", 'https://va.vercel-scripts.com']));
    expect(csp['connect-src']).toEqual(expect.arrayContaining(['ws://localhost:*', 'https://va.vercel-scripts.com']));
    expect(Object.keys(csp)).not.toContain('upgrade-insecure-requests');
  });
});

describe('règles d’en-têtes de next.config', () => {
  it('deux règles qui ne se recouvrent pas : /admin (avec la carte) et tout le reste (sans)', () => {
    const [admin, rest] = buildHeaderRules();
    expect(admin?.source).toBe('/admin/:path*');
    expect(admin?.headers.find((h) => h.key === 'Content-Security-Policy')?.value).toContain('tile.openstreetmap.org');

    expect(rest?.source).toMatch(/\(\?!admin/);
    expect(rest?.headers.find((h) => h.key === 'Content-Security-Policy')?.value).not.toContain('openstreetmap');

    // Chaque adresse tombe dans UNE seule règle (sinon la seconde écraserait la première).
    const adminRule = pathToRegexp(admin?.source ?? '');
    const restRule = pathToRegexp(rest?.source ?? '');
    for (const path of ['/admin', '/admin/', '/admin/login', '/admin/produits/abc']) {
      expect([path, adminRule.test(path), restRule.test(path)]).toEqual([path, true, false]);
    }
    for (const path of ['/', '/boutique', '/produit/beurre', '/api/health', '/administration', '/commande/confirmation']) {
      expect([path, adminRule.test(path), restRule.test(path)]).toEqual([path, false, true]);
    }
  });

  it('garde les quatre en-têtes déjà en place sur les deux règles', () => {
    for (const rule of buildHeaderRules()) {
      for (const header of baseSecurityHeaders) expect(rule.headers).toContainEqual(header);
    }
    expect(baseSecurityHeaders.map((h) => h.key)).toEqual(['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']);
  });

  it('CSP_REPORT_ONLY : la politique est seulement observée, jamais appliquée', () => {
    for (const rule of buildHeaderRules({ reportOnly: true })) {
      const keys = rule.headers.map((h) => h.key);
      expect(keys).toContain('Content-Security-Policy-Report-Only');
      expect(keys).not.toContain('Content-Security-Policy');
    }
  });

  it('par défaut la politique est appliquée (pas seulement observée)', () => {
    for (const rule of buildHeaderRules()) {
      const keys = rule.headers.map((h) => h.key);
      expect(keys).toContain('Content-Security-Policy');
      expect(keys).not.toContain('Content-Security-Policy-Report-Only');
    }
  });
});
