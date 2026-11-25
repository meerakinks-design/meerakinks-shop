// Contrat des routes /api/v1/admin côté navigateur : un composant appelle `adminApi.*`, jamais une URL.
import { deleteJson, postJson, putJson } from '@/lib/api-client';
import { ADMIN_ORDERS_API_PATH } from '@/lib/constants/admin-orders';
import type { UploadKind } from '@/lib/constants/images';
import type { DeliveryStatusValue } from '@/lib/constants/order-status';
import type { CategoryFormInput } from '@/lib/validation/category.schema';
import type { DeliveryNotesFormInput, DeliveryZoneFormInput } from '@/lib/validation/delivery-zone.schema';
import type { ProductFormInput } from '@/lib/validation/product.schema';
import type { DeliveryChangeResult, FeeResult, PaymentResult } from '@/server/services/orders-admin.service';

/** Ce que le navigateur envoie pour un paiement (la date et la note sont facultatives). */
export interface PaymentFormInput {
  kind: 'DEPOSIT' | 'BALANCE' | 'FULL' | 'REFUND';
  method: 'WAVE' | 'CASH' | 'OTHER';
  amount: number;
  receivedAt?: string;
  note?: string;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowedFormats: string;
  /** Type de média signé : détermine l'adresse d'envoi chez Cloudinary (/image/upload ou /video/upload). */
  resourceType: UploadKind;
  signature: string;
}

const BASE = '/api/v1/admin';

export const adminApi = {
  products: {
    create: (input: ProductFormInput) => postJson<{ id: string; slug: string }>(`${BASE}/products`, input),
    update: (id: string, input: ProductFormInput) => putJson<{ id: string; slug: string }>(`${BASE}/products/${encodeURIComponent(id)}`, input),
    remove: (id: string) => deleteJson<Record<string, never>>(`${BASE}/products/${encodeURIComponent(id)}`),
  },
  categories: {
    create: (input: CategoryFormInput) => postJson<{ id: string; slug: string }>(`${BASE}/categories`, input),
    update: (id: string, input: CategoryFormInput) => putJson<{ id: string; slug: string }>(`${BASE}/categories/${encodeURIComponent(id)}`, input),
    remove: (id: string) => deleteJson<Record<string, never>>(`${BASE}/categories/${encodeURIComponent(id)}`),
  },
  // Zones de livraison et textes de délais (écran /admin/livraison, propriétaire).
  deliveryZones: {
    create: (input: DeliveryZoneFormInput) => postJson<{ id: string }>(`${BASE}/delivery-zones`, input),
    update: (id: string, input: DeliveryZoneFormInput) => putJson<{ id: string }>(`${BASE}/delivery-zones/${encodeURIComponent(id)}`, input),
    remove: (id: string) => deleteJson<Record<string, never>>(`${BASE}/delivery-zones/${encodeURIComponent(id)}`),
  },
  deliveryNotes: {
    update: (input: DeliveryNotesFormInput) => putJson<Record<string, never>>(`${BASE}/delivery-notes`, input),
  },
  orders: {
    changeStatus: (id: string, status: DeliveryStatusValue, note?: string) =>
      postJson<DeliveryChangeResult>(`${ADMIN_ORDERS_API_PATH}/${encodeURIComponent(id)}/status`, { status, ...(note ? { note } : {}) }),
    recordPayment: (id: string, input: PaymentFormInput) => postJson<PaymentResult>(`${ADMIN_ORDERS_API_PATH}/${encodeURIComponent(id)}/payments`, input),
    voidPayment: (id: string, paymentId: string, reason: string) =>
      postJson<PaymentResult>(`${ADMIN_ORDERS_API_PATH}/${encodeURIComponent(id)}/payments/${encodeURIComponent(paymentId)}/void`, { reason }),
    setDeliveryFee: (id: string, fee: number) => putJson<FeeResult>(`${ADMIN_ORDERS_API_PATH}/${encodeURIComponent(id)}/delivery-fee`, { fee }),
    setNote: (id: string, note: string) => putJson<{ note: string | null }>(`${ADMIN_ORDERS_API_PATH}/${encodeURIComponent(id)}/note`, { note }),
  },
  uploads: {
    sign: (kind: UploadKind = 'image') => postJson<UploadSignature>(`${BASE}/uploads/sign`, { kind }),
  },
};
