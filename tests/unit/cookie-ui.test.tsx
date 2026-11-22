import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsentState } from '@/lib/consent';
import type { PublicSettings } from '@/server/services/catalog.queries';

let consentState: ConsentState = 'unset';
let pathname: string | null = '/';

vi.mock('@/components/shop/useConsent', () => ({ useConsent: () => consentState }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...(rest as object)}>
      {children}
    </a>
  ),
}));
const settingsMock = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('@/server/services/catalog.queries', () => ({ getPublicSettings: async () => settingsMock.value }));

const { CookieBanner } = await import('@/components/shop/CookieBanner');
const { CookieChoice } = await import('@/components/shop/CookieChoice');
const { ConsentGatedAnalytics } = await import('@/components/shop/ConsentGatedAnalytics');
const cookiesPage = await import('@/app/(boutique)/cookies/page');
const privacyPage = await import('@/app/(boutique)/politique-de-confidentialite/page');

const settings = (overrides: Partial<PublicSettings> = {}): PublicSettings => ({
  storeName: 'Awa Beauty', whatsappNumber: null, whatsappLink: null, contactEmail: null, contactPhone: null,
  instagramUrl: null, tiktokUrl: null, facebookUrl: null, focusProductId: null, depositAmount: 2000, ...overrides,
});

beforeEach(() => {
  consentState = 'unset';
  pathname = '/';
  settingsMock.value = settings();
});

describe('bannière de consentement', () => {
  it('s’affiche tant qu’aucun choix n’est enregistré, avec Accepter et Refuser de même poids', () => {
    const html = renderToStaticMarkup(<CookieBanner homeAnalytics={false} />);
    expect(html).toContain('class="cookie-banner"');
    expect(html).toContain('Aucune adresse IP n’est conservée');
    expect(html).toContain('Vous pouvez refuser, cela ne change rien à votre commande');
    expect(html).toContain('href="/cookies"');
    const buttons = [...html.matchAll(/<button type="button" class="([^"]*)"[^>]*>([^<]*)<\/button>/g)];
    expect(buttons.map((match) => match[2])).toEqual(['Accepter', 'Refuser']);
    expect(buttons[0]?.[1]).toBe(buttons[1]?.[1]); // exactement le même style
  });

  it('ne s’affiche pas pendant le rendu serveur (« pending »), après un choix, ni sur /cookies', () => {
    for (const state of ['pending', 'granted', 'denied'] as const) {
      consentState = state;
      expect(renderToStaticMarkup(<CookieBanner homeAnalytics={false} />)).toBe('');
    }
    consentState = 'unset';
    pathname = '/cookies';
    expect(renderToStaticMarkup(<CookieBanner homeAnalytics={false} />)).toBe('');
  });

  it('annonce l’analytique maison seulement quand elle existe', () => {
    expect(renderToStaticMarkup(<CookieBanner homeAnalytics={false} />)).not.toContain('boutons touchés');
    expect(renderToStaticMarkup(<CookieBanner homeAnalytics />)).toContain('boutons touchés et durée de visite');
  });
});

describe('page /cookies — « Votre choix actuel »', () => {
  it.each([
    ['pending', 'Vérification de votre choix…', true],
    ['unset', 'pas encore fait de choix', false],
    ['granted', 'accepté la mesure', false],
    ['denied', 'refusé la mesure', false],
  ] as const)('état %s', (state, text, disabled) => {
    consentState = state;
    const html = renderToStaticMarkup(<CookieChoice />);
    expect(html).toContain(text);
    expect(html).toContain('role="status"');
    expect(html.includes('disabled')).toBe(disabled);
  });
});

describe('Vercel Web Analytics — jamais avant « Accepter »', () => {
  it('ne rend rien tant que le choix n’est pas « granted »', () => {
    for (const state of ['pending', 'unset', 'denied'] as const) {
      consentState = state;
      expect(renderToStaticMarkup(<ConsentGatedAnalytics />)).toBe('');
    }
  });

  it('@vercel/analytics n’est importé nulle part ailleurs que dans la barrière, et seulement en import dynamique', () => {
    const files: string[] = [];
    const walk = (directory: string) => {
      for (const name of readdirSync(directory)) {
        const path = join(directory, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name)) files.push(path);
      }
    };
    walk(join(process.cwd(), 'src'));
    const importsPackage = /(?:from\s+|import\(\s*|require\(\s*)['"]@vercel\/analytics/;
    const importing = files.filter((file) => importsPackage.test(readFileSync(file, 'utf8')));
    expect(importing.map((file) => file.slice(process.cwd().length + 1))).toEqual(['src/components/shop/ConsentGatedAnalytics.tsx']);
    const source = readFileSync(importing[0]!, 'utf8');
    expect(source).not.toMatch(/^import .*@vercel\/analytics/m);
    expect(source).toContain("import('@vercel/analytics/next')");
    expect(source).toContain('ssr: false');
    expect(source).toContain('beforeSend={beforeSendWithConsent}');
  });

  it('la bannière et la barrière sont montées dans la vitrine, et pas dans le back-office', () => {
    const shop = readFileSync(join(process.cwd(), 'src/app/(boutique)/layout.tsx'), 'utf8');
    expect(shop).toContain('<CookieBanner');
    expect(shop).toContain('<ConsentGatedAnalytics');
    const admin = readFileSync(join(process.cwd(), 'src/app/admin/(protege)/layout.tsx'), 'utf8');
    expect(admin).not.toContain('ConsentGatedAnalytics');
  });
});

describe('pages /cookies et politique de confidentialité', () => {
  it('/cookies : non indexée, avec le choix actuel et les sections attendues', async () => {
    expect(cookiesPage.metadata.robots).toEqual({ index: false, follow: true });
    const html = renderToStaticMarkup(await cookiesPage.default());
    expect(html).toContain('Gérer mes cookies');
    expect(html).toContain('Votre choix actuel');
    for (const title of ['Ce qui est mesuré', 'Ce que fait chaque choix', 'Ce qui est enregistré dans votre navigateur', 'Conservation', 'Vos droits']) {
      expect(html).toContain(title);
    }
  });

  it('politique de confidentialité : texte réel, bandeau « provisoire » et non indexée tant que non validée', async () => {
    expect(privacyPage.metadata.robots).toEqual({ index: false, follow: true });
    const html = renderToStaticMarkup(await privacyPage.default());
    expect(html).toContain('Version provisoire');
    expect(html).toContain('Awa Beauty');
    expect(html).not.toContain('en cours de rédaction');
    for (const title of ['Qui est responsable de vos données ?', 'Quelles données sont collectées ?', 'Pourquoi ces données ?', 'Qui reçoit vos données ?', 'Combien de temps ?', 'Vos droits']) {
      expect(html).toContain(title);
    }
    expect(html).toContain('href="/cookies"');
  });

  it('n’affiche que les moyens de contact réellement configurés', async () => {
    settingsMock.value = settings();
    expect(renderToStaticMarkup(await privacyPage.default())).toContain('seront indiqués ici dès leur confirmation');

    settingsMock.value = settings({ whatsappLink: 'https://wa.me/2250700000000', contactEmail: 'contact@awa.example' });
    const html = renderToStaticMarkup(await privacyPage.default());
    expect(html).toContain('href="https://wa.me/2250700000000"');
    expect(html).toContain('href="mailto:contact@awa.example"');
    expect(html).not.toContain('seront indiqués ici');
  });
});
