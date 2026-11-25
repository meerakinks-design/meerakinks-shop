import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSocialLinks } from '@/lib/shop/socials';
import { Footer } from '@/components/shop/Footer';
import type { PublicSettings } from '@/server/services/catalog.queries';

vi.mock('@/components/shop/SmashGame', () => ({ SmashGame: () => null }));
vi.mock('@/components/shop/FooterCredit', () => ({ FooterCredit: () => null }));

const base: PublicSettings = {
  storeName: 'Meëra Kinks', whatsappNumber: null, whatsappLink: null, contactEmail: null, contactPhone: null,
  instagramUrl: null, tiktokUrl: null, facebookUrl: null, focusProductId: null, depositAmount: 2000,
};
const all: PublicSettings = {
  ...base, whatsappLink: 'https://wa.me/2250700000000', instagramUrl: 'https://instagram.com/awa', tiktokUrl: 'https://tiktok.com/@awa', facebookUrl: 'https://facebook.com/awa',
};

describe('réseaux de la marque', () => {
  it('ordre : WhatsApp, Instagram, TikTok, Facebook ; un réseau sans lien n’apparaît pas', () => {
    expect(buildSocialLinks(all).map((link) => link.name)).toEqual(['whatsapp', 'instagram', 'tiktok', 'facebook']);
    expect(buildSocialLinks({ ...all, tiktokUrl: null, whatsappLink: null }).map((link) => link.name)).toEqual(['instagram', 'facebook']);
    expect(buildSocialLinks(base)).toEqual([]);
  });

  it('pied de page : les quatre icônes sont sous le logo, dans la zone de marque', () => {
    const html = renderToStaticMarkup(<Footer settings={all} showCollections={false} />);
    const brand = html.slice(html.indexOf('class="footer-brand"'), html.indexOf('footer-col-info'));
    expect(brand).toContain('class="footer-icons"');
    for (const label of ['WhatsApp', 'Instagram', 'TikTok', 'Facebook']) expect(brand).toContain(`aria-label="${label}"`);
    expect(brand.indexOf('<img')).toBeLessThan(brand.indexOf('footer-icons'));
  });

  it('filigrane du pied de page : écrit dans la police du logo (variable --font-logo)', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const ui = readFileSync(path.resolve(__dirname, '../../src/styles/ui.css'), 'utf-8');
    const rule = ui.split('\n').find((line) => line.startsWith('.footer-watermark')) ?? '';
    expect(rule).toContain('font-family: var(--font-logo)');
    const tokens = readFileSync(path.resolve(__dirname, '../../src/styles/tokens.css'), 'utf-8');
    expect(tokens).toMatch(/--font-logo: 'Modak'/);
  });
});

describe('repli des liens par l’environnement', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function settingsWithEnv(env: Record<string, string>, dbRow: Record<string, unknown> | null) {
    vi.resetModules();
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    vi.stubEnv('SKIP_DB_AT_BUILD', '');
    vi.doMock('@/server/db', () => ({ prisma: { storeSettings: { findUnique: vi.fn().mockResolvedValue(dbRow) } } }));
    const queries = await import('@/server/services/catalog.queries');
    return queries.getPublicSettings();
  }

  it('INSTAGRAM_URL, TIKTOK_URL et FACEBOOK_URL comblent les liens vides des réglages', async () => {
    const settings = await settingsWithEnv(
      { INSTAGRAM_URL: 'https://instagram.com/meerakinks', TIKTOK_URL: 'https://tiktok.com/@meerakinks', FACEBOOK_URL: 'https://facebook.com/meerakinks' },
      { storeName: 'X', sellerWhatsApp: '+2250700000000', contactEmail: null, contactPhone: null, instagramUrl: null, tiktokUrl: null, facebookUrl: null, focusProductId: null, depositAmount: 2000 },
    );
    expect(settings.instagramUrl).toBe('https://instagram.com/meerakinks');
    expect(settings.tiktokUrl).toBe('https://tiktok.com/@meerakinks');
    expect(settings.facebookUrl).toBe('https://facebook.com/meerakinks');
  });

  it('un lien saisi dans les réglages l’emporte ; une valeur invalide ou en http est ignorée', async () => {
    const settings = await settingsWithEnv(
      { INSTAGRAM_URL: 'https://instagram.com/env', TIKTOK_URL: 'http://tiktok.com/@insecure', FACEBOOK_URL: 'pas une adresse' },
      { storeName: 'X', sellerWhatsApp: 'À configurer', contactEmail: null, contactPhone: null, instagramUrl: 'https://instagram.com/db', tiktokUrl: null, facebookUrl: null, focusProductId: null, depositAmount: 2000 },
    );
    expect(settings.instagramUrl).toBe('https://instagram.com/db');
    expect(settings.tiktokUrl).toBeNull();
    expect(settings.facebookUrl).toBeNull();
  });
});
