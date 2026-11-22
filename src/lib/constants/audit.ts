// Actions inscrites au journal d'audit du back-office (table AdminAuditLog). Liste fermée : une action inconnue ne
// s'enregistre pas. Le journal ne contient jamais de donnée personnelle d'un client.

export const AUDIT_ACTIONS = [
  'ADMIN_PASSWORD_CHANGED', // changement de mot de passe (les autres sessions sont révoquées)
  'CUSTOMER_ANONYMIZED', // effacement d'un client sur demande (details : identifiant de la fiche, nombre de commandes)
  'RETENTION_PURGE', // purge planifiée de fin de conservation (details : nombre de clients anonymisés)
  'ORDERS_EXPORTED', // export Excel ou CSV des commandes (details : format, filtres, nombre de lignes)
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Seules des valeurs simples sont admises : impossible d'y glisser un objet client entier. */
export type AuditDetails = Record<string, string | number | boolean | null>;
