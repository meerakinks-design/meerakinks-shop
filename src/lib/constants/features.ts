// Interrupteurs de fonctionnalités. La commande en ligne s'active quand l'étape « commande » est livrée.
export const CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === '1';

export const HOME_ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_HOME_ANALYTICS_ENABLED === '1';
