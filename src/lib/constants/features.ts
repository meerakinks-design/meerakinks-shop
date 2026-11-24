// Interrupteurs de fonctionnalités. La commande en ligne s'active quand l'étape « commande » est livrée.
export const CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === '1';

export const HOME_ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_HOME_ANALYTICS_ENABLED === '1';

/** Formulaire de contact (envoi par Resend). Actif par défaut ; `NEXT_PUBLIC_CONTACT_FORM_ENABLED=0` le masque et ferme la route. */
export const CONTACT_FORM_ENABLED = process.env.NEXT_PUBLIC_CONTACT_FORM_ENABLED !== '0';
