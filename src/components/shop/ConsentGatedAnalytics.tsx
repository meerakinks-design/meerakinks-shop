'use client';

import dynamic from 'next/dynamic';
import { beforeSendWithConsent } from '@/lib/shop/analytics-event';
import { useConsent } from './useConsent';

// Vercel Web Analytics (D-22, P-57) : rien n'est même téléchargé avant « Accepter » (import dynamique,
// pas de rendu serveur). Après « Accepter », le script se charge depuis le site lui-même
// (`/_vercel/insights/…`) : la Content-Security-Policy n'a donc rien d'autre à autoriser.
const Analytics = dynamic(() => import('@vercel/analytics/next').then((module) => module.Analytics), { ssr: false });

export function ConsentGatedAnalytics() {
  return useConsent() === 'granted' ? <Analytics beforeSend={beforeSendWithConsent} /> : null;
}
