import { afterEach, describe, expect, it, vi } from 'vitest';
import { beforeSendWithConsent, sanitizeAnalyticsUrl } from '@/lib/shop/analytics-event';

describe('sanitizeAnalyticsUrl', () => {
  it('garde le chemin et retire les paramètres et le fragment', () => {
    expect(sanitizeAnalyticsUrl('https://boutique.example/produit/gel?ref=ABC&q=dupont#avis')).toBe('https://boutique.example/produit/gel');
    expect(sanitizeAnalyticsUrl('/boutique?q=nom+prenom&page=2')).toBe('/boutique');
  });

  it('conserve uniquement les paramètres de campagne (lien balisé)', () => {
    expect(sanitizeAnalyticsUrl('/?utm_source=instagram&utm_medium=bio&utm_campaign=lancement&fbclid=xyz&ref=1')).toBe(
      '/?utm_source=instagram&utm_medium=bio&utm_campaign=lancement',
    );
    expect(sanitizeAnalyticsUrl('https://boutique.example/?utm_source=tiktok&email=a@b.c')).toBe('https://boutique.example/?utm_source=tiktok');
  });

  it('borne la longueur d’un paramètre de campagne', () => {
    const result = sanitizeAnalyticsUrl(`/?utm_source=${'a'.repeat(500)}`) ?? '';
    expect(result.length).toBeLessThan(140);
  });

  it('ne mesure jamais le back-office, l’API, la commande ni la confirmation', () => {
    for (const path of ['/admin', '/admin/login', '/admin/commandes/123', '/api/v1/orders', '/commande', '/commande/confirmation?ref=ABC']) {
      expect(sanitizeAnalyticsUrl(path)).toBeNull();
      expect(sanitizeAnalyticsUrl(`https://boutique.example${path}`)).toBeNull();
    }
  });

  it('ne confond pas avec des chemins voisins', () => {
    expect(sanitizeAnalyticsUrl('/administration')).toBe('/administration');
    expect(sanitizeAnalyticsUrl('/commandes-speciales')).toBe('/commandes-speciales');
  });

  it('abandonne une adresse illisible plutôt que de la transmettre', () => {
    expect(sanitizeAnalyticsUrl('http://[')).toBeNull();
  });
});

describe('beforeSendWithConsent', () => {
  afterEach(() => vi.unstubAllGlobals());
  const withCookie = (cookie: string | undefined) => vi.stubGlobal('document', cookie === undefined ? undefined : { cookie });
  const event = { type: 'pageview', url: 'https://boutique.example/produit/gel?ref=1' };

  it('abandonne tout envoi sans choix, ou après un refus', () => {
    withCookie('');
    expect(beforeSendWithConsent(event)).toBeNull();
    withCookie('boutique_consent=denied');
    expect(beforeSendWithConsent(event)).toBeNull();
    withCookie(undefined);
    expect(beforeSendWithConsent(event)).toBeNull();
  });

  it('après « Accepter », envoie l’événement avec une adresse nettoyée', () => {
    withCookie('boutique_consent=granted');
    expect(beforeSendWithConsent(event)).toEqual({ type: 'pageview', url: 'https://boutique.example/produit/gel' });
  });

  it('relit le choix à chaque envoi : un refus coupe la mesure sans rechargement', () => {
    withCookie('boutique_consent=granted');
    expect(beforeSendWithConsent(event)).not.toBeNull();
    withCookie('boutique_consent=denied');
    expect(beforeSendWithConsent(event)).toBeNull();
  });

  it('abandonne les pages jamais mesurées même après « Accepter »', () => {
    withCookie('boutique_consent=granted');
    expect(beforeSendWithConsent({ type: 'pageview', url: 'https://boutique.example/commande/confirmation?ref=ABC' })).toBeNull();
    expect(beforeSendWithConsent({ type: 'pageview', url: 'https://boutique.example/admin' })).toBeNull();
  });
});
