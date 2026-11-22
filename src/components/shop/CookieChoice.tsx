'use client';

import {
  CHOICE_STATUS,
  CHOICE_TITLE,
  CONSENT_ACCEPT_LABEL,
  CONSENT_REFUSE_LABEL,
} from '@/content/cookies';
import { setConsent } from '@/lib/consent';
import { useConsent } from './useConsent';

/** « Votre choix actuel » sur /cookies : on peut changer d'avis à tout moment (P-44). */
export function CookieChoice() {
  const state = useConsent();
  return (
    <section className="cookie-choice" aria-labelledby="choix-actuel">
      <h2 id="choix-actuel">{CHOICE_TITLE}</h2>
      <p role="status">{CHOICE_STATUS[state]}</p>
      <div className="cookie-banner-actions">
        <button type="button" className="btn" onClick={() => setConsent('granted')} disabled={state === 'pending'}>
          {CONSENT_ACCEPT_LABEL}
        </button>
        <button type="button" className="btn" onClick={() => setConsent('denied')} disabled={state === 'pending'}>
          {CONSENT_REFUSE_LABEL}
        </button>
      </div>
    </section>
  );
}
