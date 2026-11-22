// Export des commandes (cahier P-55, D-25, RM-48). Une seule source pour les chemins, les formats et les limites.

export const ORDERS_EXPORT_API_PATH = '/api/v1/admin/orders/export';
export const ADMIN_ORDERS_EXPORT_PATH = '/admin/export-commandes';

/** Nombre maximal de commandes dans un fichier 🟡 (cahier P-55) : au-delà, on demande de réduire la période. */
export const ORDERS_EXPORT_MAX_ROWS = 5000;

export const ORDERS_EXPORT_FORMATS = ['xlsx', 'csv'] as const;
export type OrdersExportFormat = (typeof ORDERS_EXPORT_FORMATS)[number];

export const ORDERS_EXPORT_FORMAT_LABELS: Record<OrdersExportFormat, string> = {
  xlsx: 'Excel (.xlsx)',
  csv: 'CSV (s’ouvre dans Excel, séparateur « ; »)',
};

export const ORDERS_EXPORT_CONTENT_TYPES: Record<OrdersExportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
};

/** En-tête de réponse : nombre de commandes dans le fichier (affiché après le téléchargement). */
export const ORDERS_EXPORT_ROWS_HEADER = 'X-Export-Rows';

/** Libellés courts des zones dans le fichier et dans les filtres. */
export const ORDERS_EXPORT_ZONE_LABELS = {
  ABIDJAN: 'Abidjan',
  INTERIOR: 'Côte d’Ivoire (hors Abidjan)',
  INTERNATIONAL: 'International',
} as const;
