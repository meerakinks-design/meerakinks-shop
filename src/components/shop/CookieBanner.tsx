'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CONSENT_ACCEPT_LABEL,
  CONSENT_BANNER_LABEL,
  CONSENT_LEARN_MORE_LABEL,
  CONSENT_REFUSE_LABEL,
  bannerText,
} from '@/content/cookies';
import { setConsent, type ConsentChoice } from '@/lib/consent';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import { useConsent } from './useConsent';

/**
 * Bannière de consentement à la mesure d'audience (P-44). Elle ne bloque rien : le site reste utilisable, le panier et la
 * commande aussi. « Accepter » et « Refuser » ont exactement le même poids visuel. Elle n'apparaît que lorsqu'aucun
 * choix n'est enregistré (jamais pendant le rendu serveur : le HTML statique est identique pour tous), et pas sur
 * /cookies, où le choix se fait déjà.
 */
export function CookieBanner({ homeAnalytics }: { homeAnalytics: boolean }) {
  const state = useConsent();
  const pathname = usePathname();
  if (state !== 'unset' || pathname === PUBLIC_ROUTES.cookies) return null;

  function choose(choice: ConsentChoice) {
    setConsent(choice);
    // La bannière disparaît : on rend le focus au contenu pour ne pas laisser un utilisateur au clavier « dans le vide ».
    document.getElementById('contenu')?.focus({ preventScroll: true });
  }

  return (
    <section className="cookie-banner" aria-label={CONSENT_BANNER_LABEL}>
      <div className="cookie-banner-inner">
        <p>
          {bannerText(homeAnalytics)}{' '}
          <Link href={PUBLIC_ROUTES.cookies}>{CONSENT_LEARN_MORE_LABEL}</Link>
        </p>
        <div className="cookie-banner-actions">
          <button type="button" className="btn" onClick={() => choose('granted')}>
            {CONSENT_ACCEPT_LABEL}
          </button>
          <button type="button" className="btn" onClick={() => choose('denied')}>
            {CONSENT_REFUSE_LABEL}
          </button>
        </div>
      </div>
    </section>
  );
}
