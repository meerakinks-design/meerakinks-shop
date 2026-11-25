import { describe, expect, it } from 'vitest';
import type { LegalSection } from '@/content/cookies';
import { HOST, LEGAL_DETAILS } from '@/content/legal-details';
import { LEGAL_LAST_UPDATED, PRIVACY_TEXTS_VALIDATED } from '@/content/legal-status';
import { PAYMENT_OUTSIDE, paymentAbidjan } from '@/content/livraison';
import { cgvIntro, cgvSections, cguIntro, cguSections, legalNoticeIntro, legalNoticeSections } from '@/content/legal-pages';
import { privacySections } from '@/content/privacy';
import { DEFAULT_DELAYS, faqDelayAnswer } from '@/lib/shop/delivery-delay';

const flatten = (sections: LegalSection[]) =>
  sections.flatMap((section) => [section.title, ...section.paragraphs, ...(section.items ?? [])]).join('\n');

const STORE = 'Meëra Kinks';
const cgv = cgvSections({ storeName: STORE, depositAmount: 2000 });
const cgu = cguSections({ storeName: STORE });
const notice = legalNoticeSections({ storeName: STORE });

describe('CGV, CGU et mentions légales', () => {
  it('restent provisoires tant qu’un professionnel ne les a pas validées', () => {
    expect(PRIVACY_TEXTS_VALIDATED).toBe(false);
    expect(LEGAL_LAST_UPDATED).toMatch(/^\d{1,2} \w+ \d{4}$/);
  });

  it('ne contiennent aucun crochet ni marqueur à compléter, et vouvoient', () => {
    const texts = [flatten(cgv), flatten(cgu), flatten(notice), cgvIntro(STORE), cguIntro(STORE), legalNoticeIntro(STORE)];
    for (const text of texts) {
      expect(text).not.toMatch(/\[[^\]]*\]|TODO|À COMPLÉTER|XXX|🟡|❓|lorem/i);
      expect(text).not.toMatch(/\b(tu|ton|ta|tes|toi)\b/i);
    }
    expect(cgvIntro(STORE)).toContain(STORE);
  });

  it('chaque page a des sections à identifiant unique, avec titre', () => {
    for (const sections of [cgv, cgu, notice]) {
      const ids = sections.map((section) => section.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const section of sections) expect(section.title.length).toBeGreaterThan(3);
    }
  });

  it('reprennent les règles de paiement de la source unique (jamais un texte différent de la FAQ ni du formulaire)', () => {
    const text = flatten(cgv);
    expect(text).toContain(paymentAbidjan(2000));
    expect(text).toContain(PAYMENT_OUTSIDE);
    expect(text).toContain('Wave');
    expect(flatten(cgvSections({ storeName: STORE, depositAmount: 3500 }))).toContain(paymentAbidjan(3500));
  });

  it('présentent les délais comme indicatifs et les lisent dans les zones, sans les transformer en garantie', () => {
    const text = flatten(cgv);
    expect(text).toContain(faqDelayAnswer(DEFAULT_DELAYS));
    expect(text).toContain('Un délai indicatif n’est pas une date garantie');
    expect(text).not.toMatch(/garantie[ds]? (de )?livraison|livré sous|livraison garantie/i);
    const custom = flatten(cgvSections({ storeName: STORE, depositAmount: 2000, delays: { ...DEFAULT_DELAYS, ABIDJAN: { minHours: 24, maxHours: 48 } }, notes: { leadTimeNote: 'Le délai court dès la confirmation.', rules: null } }));
    expect(custom).toContain('24 à 48 h à Abidjan');
    expect(custom).toContain('Le délai court dès la confirmation.');
  });

  it('n’inventent ni retour, ni remboursement, ni tribunal : ce que la vendeuse n’a pas confirmé est dit comme tel', () => {
    const text = flatten(cgv);
    expect(text).toContain('sont confirmées par la vendeuse');
    expect(text).toContain('juridictions compétentes');
    expect(text).not.toMatch(/\b\d+ jours? pour (retourner|vous rétracter|être remboursé)|droit de rétractation|tribunal de commerce d’/i);
  });

  it('la commande décrit les étapes réelles (formulaire, référence, reçu, contact WhatsApp, paiement)', () => {
    const text = flatten(cgv);
    for (const expected of ['référence', 'reçu', 'WhatsApp', 'vérifier les informations', 'disponibilité', 'modifier votre panier']) expect(text).toContain(expected);
  });

  it('les mentions légales n’inventent aucune identité : tout ce qui n’est pas confirmé reste absent', () => {
    expect(Object.values(LEGAL_DETAILS).every((value) => value === null)).toBe(true);
    expect(notice.some((section) => section.id === 'publication')).toBe(false);
    expect(notice.find((section) => section.id === 'editeur')?.showIdentity).toBe(true);
  });

  it('nomment l’hébergeur réel du site', () => {
    expect(HOST.name).toBe('Vercel Inc.');
    expect(flatten(notice)).toContain(HOST.address);
    expect(flatten(notice)).toContain('vercel.com');
  });

  it('les CGU décrivent le jeu sans rien promettre de ce que le code ne fait pas', () => {
    const text = flatten(cgu);
    expect(text).toContain('Cosmetic Smash');
    expect(text).toContain('scores ne sont pas enregistrés');
    expect(text).not.toMatch(/exclu(t|ons) toute responsabilité|aucune responsabilité/i);
  });

  it('chaque page renvoie vers la politique de confidentialité ou les contacts quand elle parle de données', () => {
    expect(cgv.some((section) => section.link?.href === '/politique-de-confidentialite')).toBe(true);
    expect(cgu.some((section) => section.link?.href === '/politique-de-confidentialite')).toBe(true);
    expect(cgv.some((section) => section.showContact)).toBe(true);
  });
});

describe('politique de confidentialité mise à jour', () => {
  const home = flatten(privacySections({ homeAnalytics: true }));
  const base = flatten(privacySections({ homeAnalytics: false }));

  it('indique l’autorité ivoirienne et l’identité du responsable', () => {
    expect(base).toContain('infos-apdp@artci.ci');
    expect(privacySections({ homeAnalytics: false }).find((section) => section.id === 'responsable')?.showIdentity).toBe(true);
  });

  it('couvre les rubriques exigées : fondement, destinataires, transferts, durées, sécurité, droits, mises à jour', () => {
    const ids = privacySections({ homeAnalytics: false }).map((section) => section.id);
    for (const id of ['responsable', 'donnees', 'finalites', 'fondement', 'destinataires', 'transferts', 'durees', 'securite', 'droits', 'mises-a-jour']) expect(ids).toContain(id);
  });

  it('ne parle de la mesure de la boutique (région, appareil, détail supprimé) que si elle existe', () => {
    expect(home).toMatch(/type d’appareil et navigateur/);
    expect(home).toContain('90 jours');
    expect(base).not.toMatch(/type d’appareil|90 jours/);
  });

  it('ne promet pas ce que le site ne fait pas : pas d’autorisation de transfert affirmée, pas de vente de données', () => {
    expect(base).not.toMatch(/autoris(é|ation) (par|de) l’ARTCI|déclaré auprès|certifié/i);
    expect(base).toContain('ne vend pas vos données');
  });
});
