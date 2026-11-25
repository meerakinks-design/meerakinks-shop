// Contrat de l'analytique maison entre le navigateur et le serveur (cahier §7.6, P-43).
// LISTES FERMÉES : le serveur refuse tout type d'événement et tout identifiant de bouton absent d'ici. Rien de libre
// (pas de texte saisi, pas de montant, pas de donnée client) ne peut donc être enregistré par ce canal.

/** Événements du parcours (sans montant ni donnée client, sans lien avec une commande). */
export const FUNNEL_EVENTS = ['product_view', 'add_to_cart', 'remove_from_cart', 'checkout_started', 'order_submitted'] as const;

export const TRACK_EVENT_TYPES = ['page_view', 'click', 'heartbeat', ...FUNNEL_EVENTS] as const;
export type TrackEventType = (typeof TRACK_EVENT_TYPES)[number];
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

/** Types enregistrés en base (la visite s'ouvre côté serveur ; le signal d'activité ne crée pas de ligne). */
export const STORED_EVENT_TYPES = ['visit_start', 'page_view', 'click', ...FUNNEL_EVENTS] as const;
export type StoredEventType = (typeof STORED_EVENT_TYPES)[number];

/** Boutons et liens du site public suivis : l'attribut `data-track="…"` doit porter l'une de ces valeurs. */
export const TRACK_TARGETS = [
  'header_logo',
  'header_cart',
  'header_menu',
  'menu_link',
  'hero_shop',
  'hero_focus',
  'product_card',
  'product_add',
  'sticky_add',
  'cart_checkout',
  'cart_continue',
  'checkout_submit',
  'order_whatsapp',
  'order_receipt',
  'footer_whatsapp',
  'footer_link',
  'contact_whatsapp',
  'faq_whatsapp',
  'social_link',
  'game_play',
] as const;
export type TrackTarget = (typeof TRACK_TARGETS)[number];

const TARGET_SET: ReadonlySet<string> = new Set(TRACK_TARGETS);
const TYPE_SET: ReadonlySet<string> = new Set(TRACK_EVENT_TYPES);

export const isTrackTarget = (value: unknown): value is TrackTarget => typeof value === 'string' && TARGET_SET.has(value);
export const isTrackEventType = (value: unknown): value is TrackEventType => typeof value === 'string' && TYPE_SET.has(value);

/** Libellés lisibles pour l'onglet Analytics. */
export const TARGET_LABELS: Record<TrackTarget, string> = {
  header_logo: 'Logo (en-tête)',
  header_cart: 'Panier (en-tête)',
  header_menu: 'Menu (en-tête)',
  menu_link: 'Lien du menu',
  hero_shop: 'Bouton « Voir la boutique »',
  hero_focus: 'Bouton du produit à l’honneur',
  product_card: 'Carte produit',
  product_add: 'Ajouter au panier',
  sticky_add: 'Ajouter (barre collée)',
  cart_checkout: 'Passer commande (panier)',
  cart_continue: 'Continuer mes achats',
  checkout_submit: 'Confirmer la commande',
  order_whatsapp: 'Envoyer la commande sur WhatsApp',
  order_receipt: 'Télécharger le reçu',
  footer_whatsapp: 'WhatsApp (pied de page)',
  footer_link: 'Lien du pied de page',
  contact_whatsapp: 'WhatsApp (contact)',
  faq_whatsapp: 'WhatsApp (FAQ)',
  social_link: 'Réseau social',
  game_play: 'Jouer à Cosmetic Smash',
};

export const EVENT_LABELS: Record<StoredEventType, string> = {
  visit_start: 'Arrivée sur le site',
  page_view: 'Page vue',
  click: 'Bouton touché',
  product_view: 'Fiche produit vue',
  add_to_cart: 'Ajout au panier',
  remove_from_cart: 'Retrait du panier',
  checkout_started: 'Commande démarrée',
  order_submitted: 'Commande envoyée',
};

export const TRACK_API_PATH = '/api/v1/track';
export const TRACK_ARRIVAL_API_PATH = '/api/v1/track/arrival';
export const TRACK_FORGET_API_PATH = '/api/v1/track/forget';

/** Nom de l'événement navigateur par lequel un composant signale une étape du parcours (sans importer le traqueur). */
export const TRACK_BROWSER_EVENT = 'boutique:track';

export const VISITOR_COOKIE_NAME = 'boutique_vid';
/** Identifiant aléatoire : 32 caractères hexadécimaux (128 bits). */
export const VISITOR_KEY_PATTERN = /^[0-9a-f]{32}$/;

export const TRACK_LIMITS = { path: 200, utm: 40, referrerHost: 80, heartbeatMaxSeconds: 40 } as const;
export const TRACK_RATE_LIMIT = { limit: 300, windowSeconds: 600 } as const;
export const TRACK_BODY_MAX_BYTES = 2_000;

/** Pages jamais mesurées : back-office, API, commande et confirmation (cahier §7.6). */
export const NEVER_TRACKED_PREFIXES = ['/admin', '/api', '/commande'] as const;
