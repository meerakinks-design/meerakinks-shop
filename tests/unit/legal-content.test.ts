import { describe, expect, it } from 'vitest';
import { bannerText, cookiesSections, CHOICE_STATUS, type LegalSection } from '@/content/cookies';
import { PRIVACY_TEXTS_VALIDATED } from '@/content/legal-status';
import { privacyIntro, privacySections } from '@/content/privacy';
import { CONSENT_COOKIE_DAYS, CONSENT_COOKIE_NAME } from '@/lib/consent';
import { ANALYTICS_DETAIL_RETENTION_DAYS, CUSTOMER_RETENTION_MONTHS } from '@/lib/constants/retention';
import { CART_STORAGE_KEY } from '@/lib/shop/cart';

const flatten = (sections: LegalSection[]) =>
  sections.flatMap((section) => [section.title, ...section.paragraphs, ...(section.items ?? [])]).join('\n');

describe('textes de confidentialité', () => {
  const variants = [false, true].map((homeAnalytics) => ({ homeAnalytics, cookies: flatten(cookiesSections({ homeAnalytics })), privacy: flatten(privacySections({ homeAnalytics })) }));

  it('restent provisoires : la validation par un professionnel n’est pas faite', () => {
    expect(PRIVACY_TEXTS_VALIDATED).toBe(false);
  });

  it('ne contiennent aucun crochet ni marqueur à compléter (jamais de contenu inventé)', () => {
    for (const { cookies, privacy } of variants) {
      for (const text of [cookies, privacy, privacyIntro('Awa Beauty'), ...Object.values(CHOICE_STATUS), bannerText(false), bannerText(true)]) {
        expect(text).not.toMatch(/\[[^\]]*\]|TODO|À COMPLÉTER|XXX|🟡|❓|lorem/i);
      }
    }
  });

  it('ne décrivent que ce qui est mesuré : tant que l’analytique maison n’existe pas, seul Vercel est cité', () => {
    const [without, withHome] = variants as [(typeof variants)[number], (typeof variants)[number]];
    for (const text of [without.cookies, without.privacy, bannerText(false)]) {
      expect(text).not.toMatch(/boutons touchés|durée de visite|identifiant aléatoire|nouveau visiteur/);
    }
    expect(without.cookies).toContain('Vercel Web Analytics');
    expect(withHome.cookies).toMatch(/boutons touchés/);
    expect(withHome.cookies).toContain('identifiant aléatoire');
    expect(withHome.cookies).toContain(`${ANALYTICS_DETAIL_RETENTION_DAYS} jours`);
    expect(without.cookies).not.toContain(`${ANALYTICS_DETAIL_RETENTION_DAYS} jours`);
  });

  it('listent ce que le site enregistre réellement dans le navigateur, avec les vraies valeurs', () => {
    for (const { cookies } of variants) {
      expect(cookies).toContain(CONSENT_COOKIE_NAME);
      expect(cookies).toContain(`${CONSENT_COOKIE_DAYS} jours`);
      expect(cookies).toContain(CART_STORAGE_KEY);
      expect(cookies).toContain('30 jours'); // durée du panier (CART_TTL_MS)
    }
  });

  it('lisent la durée de conservation dans la constante du code, pas dans un texte figé', () => {
    for (const { privacy } of variants) {
      expect(privacy).toContain(`${CUSTOMER_RETENTION_MONTHS} mois après votre dernière commande`);
    }
  });

  it('nomment les prestataires qui reçoivent des données, sans en inventer', () => {
    const { privacy } = variants[0]!;
    for (const provider of ['Vercel', 'Neon', 'Resend', 'Cloudinary', 'WhatsApp']) expect(privacy).toContain(provider);
    expect(privacy).not.toMatch(/Stripe|Google Analytics|Meta Pixel|Facebook Pixel|Mailchimp|Sentry/);
  });

  it('promettent la suppression des données d’identification et le respect des commandes en cours (comme la procédure réelle)', () => {
    const { privacy } = variants[0]!;
    expect(privacy).toContain('Une commande encore en cours (ni livrée ni annulée) doit d’abord être terminée');
    expect(privacy).toContain('sans rien qui permette de vous identifier');
  });

  it('chaque section a un identifiant unique et un titre', () => {
    for (const sections of [cookiesSections({ homeAnalytics: false }), privacySections({ homeAnalytics: true })]) {
      const ids = sections.map((section) => section.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const section of sections) expect(section.title.length).toBeGreaterThan(3);
    }
  });
});
