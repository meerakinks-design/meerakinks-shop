// Interrupteurs de fonctionnalités. La commande en ligne s'active quand l'étape « commande » est livrée.
export const CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === '1';

/**
 * Analytique maison (cahier §7.6) : ACTIVE par défaut, avec consentement. Seule la valeur `0` la coupe
 * (`NEXT_PUBLIC_HOME_ANALYTICS_ENABLED=0` : plus aucune collecte, bannière sans mention des statistiques, politique de cookies adaptée).
 * Comme les variables `NEXT_PUBLIC_*` sont figées au build, un changement demande de publier à nouveau.
 */
export const HOME_ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_HOME_ANALYTICS_ENABLED !== '0';

/** Formulaire de contact (envoi par Resend). Actif par défaut ; `NEXT_PUBLIC_CONTACT_FORM_ENABLED=0` le masque et ferme la route. */
export const CONTACT_FORM_ENABLED = process.env.NEXT_PUBLIC_CONTACT_FORM_ENABLED !== '0';
