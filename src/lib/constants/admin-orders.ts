// Back-office des commandes : chemins, filtres et limites au même endroit (cahier §10, RM-16 à RM-23).

export const ADMIN_ORDERS_PATH = '/admin/commandes';
export const ADMIN_CUSTOMERS_PATH = '/admin/clients';
export const adminOrderPath = (id: string) => `${ADMIN_ORDERS_PATH}/${id}`;
export const adminCustomerPath = (id: string) => `${ADMIN_CUSTOMERS_PATH}/${id}`;

export const ADMIN_ORDERS_API_PATH = '/api/v1/admin/orders';

export const ADMIN_PAGE_SIZE = 25;

export const ADMIN_NOTE_MAX = 500;
export const ADMIN_INTERNAL_NOTE_MAX = 1000;
export const PAYMENT_NOTE_MAX = 200;
export const PAYMENT_MAX_AMOUNT = 100_000_000;
export const DELIVERY_FEE_MAX = 10_000_000;

/** Filtres de la liste, exprimés par des mots lisibles dans l'adresse (?statut=a-confirmer). */
export const ORDER_DELIVERY_FILTERS = {
  'a-confirmer': 'PENDING',
  confirmees: 'CONFIRMED',
  'en-preparation': 'PREPARING',
  'en-livraison': 'SHIPPED',
  livrees: 'DELIVERED',
  annulees: 'CANCELLED',
} as const;
export type OrderDeliveryFilterKey = keyof typeof ORDER_DELIVERY_FILTERS;

export const ORDER_PAYMENT_FILTERS = {
  'a-encaisser': ['TO_CONFIRM', 'DEPOSIT_DUE'],
  'acompte-recu': ['DEPOSIT_PAID'],
  partiel: ['PARTIALLY_PAID'],
  paye: ['PAID'],
  rembourse: ['REFUNDED'],
} as const;
export type OrderPaymentFilterKey = keyof typeof ORDER_PAYMENT_FILTERS;
