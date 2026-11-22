import type { ZoneTypeValue } from '@/lib/constants/order';
import type { DeliveryStatusValue, PaymentStatusValue } from '@/lib/constants/order-status';
import { ORDERS_EXPORT_API_PATH, type OrdersExportFormat } from '@/lib/constants/orders-export';

// Valeurs du formulaire d'export → adresse de la route. Même adresse que celle que l'écran Commandes (étape 8)
// construira avec ses filtres en cours : un seul contrat (`GET /api/v1/admin/orders/export?…`, cahier P-55).

export interface OrdersExportFormValues {
  format: OrdersExportFormat;
  from: string;
  to: string;
  deliveryStatuses: DeliveryStatusValue[];
  paymentStatuses: PaymentStatusValue[];
  zones: ZoneTypeValue[];
}

export const EMPTY_ORDERS_EXPORT_FORM: OrdersExportFormValues = {
  format: 'xlsx',
  from: '',
  to: '',
  deliveryStatuses: [],
  paymentStatuses: [],
  zones: [],
};

export function buildOrdersExportUrl(values: OrdersExportFormValues): string {
  const params = new URLSearchParams({ format: values.format });
  if (values.from) params.set('from', values.from);
  if (values.to) params.set('to', values.to);
  for (const status of values.deliveryStatuses) params.append('deliveryStatus', status);
  for (const status of values.paymentStatuses) params.append('paymentStatus', status);
  for (const zone of values.zones) params.append('zone', zone);
  return `${ORDERS_EXPORT_API_PATH}?${params.toString()}`;
}

/** Ajoute la valeur si elle manque, la retire sinon (case à cocher). */
export function toggleValue<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
