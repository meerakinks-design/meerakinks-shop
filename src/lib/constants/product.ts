export const PRODUCT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type ProductStatusValue = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Record<ProductStatusValue, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  ARCHIVED: 'Archivé',
};

export const PRODUCT_STATUS_HELP: Record<ProductStatusValue, string> = {
  DRAFT: 'Invisible pour les clients.',
  PUBLISHED: 'Visible sur le site. Il faut au moins une photo.',
  ARCHIVED: 'Retiré du site, conservé pour l’historique des commandes.',
};
