import { DELIVERY_STATUS_LABELS, PAYMENT_STATUS_LABELS, type DeliveryStatusValue, type PaymentStatusValue } from '@/lib/constants/order-status';

// Les statuts se distinguent par le libellé, la bordure et l'intensité (palette de la charte : pas de rouge ni de vert
// ajoutés). Du plus discret (terminé ou annulé) au plus appuyé (en cours de route).
const DELIVERY_CLASS: Record<DeliveryStatusValue, string> = {
  PENDING: 'badge-warn',
  CONFIRMED: 'badge-outline',
  PREPARING: 'badge-outline',
  SHIPPED: 'badge-solid',
  DELIVERED: 'badge-ok',
  CANCELLED: 'badge-void',
};

const PAYMENT_CLASS: Record<PaymentStatusValue, string> = {
  TO_CONFIRM: 'badge-warn',
  DEPOSIT_DUE: 'badge-warn',
  DEPOSIT_PAID: 'badge-outline',
  PARTIALLY_PAID: 'badge-outline',
  PAID: 'badge-ok',
  REFUNDED: 'badge-solid',
  CANCELLED: 'badge-void',
};

export function DeliveryBadge({ status }: { status: DeliveryStatusValue }) {
  return <span className={`badge ${DELIVERY_CLASS[status]}`}>{DELIVERY_STATUS_LABELS[status]}</span>;
}

export function PaymentBadge({ status }: { status: PaymentStatusValue }) {
  return <span className={`badge ${PAYMENT_CLASS[status]}`}>{PAYMENT_STATUS_LABELS[status]}</span>;
}
