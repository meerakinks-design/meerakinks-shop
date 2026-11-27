// Actions inscrites au journal d'audit du back-office (table AdminAuditLog). Liste fermée : une action inconnue ne
// s'enregistre pas. Le journal ne contient jamais de donnée personnelle d'un client.

export const AUDIT_ACTIONS = [
  'ADMIN_PASSWORD_CHANGED', // changement de mot de passe (les autres sessions sont révoquées)
  'CUSTOMER_ANONYMIZED', // effacement d'un client sur demande (details : identifiant de la fiche, nombre de commandes)
  'RETENTION_PURGE', // purge planifiée de fin de conservation (details : nombre de clients anonymisés)
  'ORDERS_EXPORTED', // export Excel ou CSV des commandes (details : format, filtres, nombre de lignes)
  'ORDER_CANCELLED', // annulation d'une commande (details : référence, stock restitué, montant à rembourser)
  'ORDER_PAYMENT_RECORDED', // encaissement ou remboursement saisi (details : référence, type, mode, montant)
  'ORDER_PAYMENT_VOIDED', // paiement annulé pour erreur de saisie (details : référence, type, montant)
  'ORDER_FEE_SET', // frais de livraison fixés par la vendeuse (details : référence, frais, total)
  'SETTINGS_UPDATED', // paramètres de la boutique modifiés (details : noms des champs changés, jamais leurs valeurs)
  'EMAIL_REQUEUED', // email abandonné relancé depuis la fiche commande (details : référence, type)
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Seules des valeurs simples sont admises : impossible d'y glisser un objet client entier. */
export type AuditDetails = Record<string, string | number | boolean | null>;
