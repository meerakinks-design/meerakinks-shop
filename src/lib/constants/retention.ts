// Conservation des données clients (cahier §10.2, « Politique de conservation » ; durée = question ❓ ouverte).
// Une seule source : la politique de confidentialité, la procédure de suppression et la purge automatique
// lisent cette valeur, donc le texte publié et le comportement ne peuvent pas diverger.

/**
 * Durée de conservation des données d'un client, comptée depuis sa DERNIÈRE commande, avant anonymisation. 🟡
 * Valeur PROPOSÉE (pas une règle juridique) : à faire valider par la cliente et un professionnel (cahier §14.2).
 */
export const CUSTOMER_RETENTION_MONTHS = 36;

/** Nombre de clients traités par passage de la purge automatique (borne le temps d'exécution et les transactions). */
export const RETENTION_BATCH_SIZE = 50;

/**
 * Durée de conservation du DÉTAIL des visites de l'analytique maison (étape 10, cahier §7.6). 🟡
 * Seule la politique de confidentialité la lit pour l'instant ; la purge arrive avec l'étape 10.
 */
export const ANALYTICS_DETAIL_RETENTION_DAYS = 90;

/** Statuts de livraison qui ferment une commande : seul un client sans commande ouverte peut être effacé. */
export const FINAL_DELIVERY_STATUSES = ['DELIVERED', 'CANCELLED'] as const;

/** Textes qui remplacent les données effacées (jamais une valeur vide : les écrans et les reçus restent lisibles). */
export const ANONYMIZED_FULL_NAME = 'Client anonymisé'; // utilisé par lib/retention.ts (v0.10)
export const ANONYMIZED_FIRST_NAME = 'Client';
export const ANONYMIZED_LAST_NAME = 'anonymisé';
export const ANONYMIZED_ADDRESS = 'Adresse supprimée';

/** Le téléphone est unique en base : on le remplace par une valeur unique par fiche, qui ne correspond à aucun numéro réel. */
export const anonymizedPhone = (customerId: string) => `anon-${customerId}`;

export const ANONYMIZE_CUSTOMER_API_PATH = '/api/v1/admin/customers/anonymize';
export const ADMIN_CUSTOMER_DATA_PATH = '/admin/donnees-clients';

/**
 * Délai maximal avant suppression d'une empreinte anti-abus (adresse IP, téléphone) expirée : la tâche planifiée
 * quotidienne la supprime ; 2 jours laissent de la marge au décalage d'horaire de Vercel (offre Hobby : ±59 minutes).
 */
export const RATE_LIMIT_FINGERPRINT_MAX_DAYS = 2;

// ---------------------------------------------------------------------------
// Analytique maison (cahier §7.6, P-43 à P-45) : durées et plafonds, lus aussi par les textes légaux.
// ---------------------------------------------------------------------------

/** Durée de vie du cookie d'identifiant de visiteur (posé APRÈS consentement seulement). Alignée sur la conservation du détail. */
export const ANALYTICS_VISITOR_COOKIE_DAYS = 90;

/** Une visite se termine après autant de minutes sans activité : l'activité suivante ouvre une nouvelle visite. 🟡 */
export const ANALYTICS_SESSION_GAP_MINUTES = 30;

/** Plafond d'alertes email « Nouvelle visite » par jour. Au-delà, la visite reste visible dans l'onglet Analytics, seul l'email est ignoré. 🟡 */
export const ANALYTICS_ALERT_DAILY_CAP = 40;

/** Signal d'activité envoyé tant que l'onglet est visible. */
export const ANALYTICS_HEARTBEAT_SECONDS = 15;
