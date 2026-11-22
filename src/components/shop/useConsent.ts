'use client';

import { useSyncExternalStore } from 'react';
import { getConsentSnapshot, getServerConsentSnapshot, subscribeConsent, type ConsentState } from '@/lib/consent';

/** Choix de consentement actuel. « pending » côté serveur et pendant l'hydratation. */
export function useConsent(): ConsentState {
  return useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);
}
