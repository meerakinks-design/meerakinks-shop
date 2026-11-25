import { isBot } from '@/lib/analytics/classify';
import { HOME_ANALYTICS_ENABLED } from '@/lib/constants/features';
import { readConsentFromCookieHeader } from '@/lib/consent';

/**
 * Conditions communes aux routes de collecte : mesure activée sur ce déploiement, consentement « accepté » lu dans le
 * cookie de la requête (le navigateur qui a refusé n'envoie rien, mais le serveur ne se fie pas à lui), et pas un robot.
 * `false` = on ignore en silence (la route répond « rien enregistré », jamais une erreur visible pour le visiteur).
 */
export function mayCollect(headers: Pick<Headers, 'get'>): boolean {
  if (!HOME_ANALYTICS_ENABLED) return false;
  if (readConsentFromCookieHeader(headers.get('cookie')) !== 'granted') return false;
  return !isBot(headers.get('user-agent'));
}
