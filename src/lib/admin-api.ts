// Contrat des routes /api/v1/admin côté navigateur : un composant appelle `adminApi.*`, jamais une URL.
import { deleteJson, postJson, putJson } from '@/lib/api-client';
import type { CategoryFormInput } from '@/lib/validation/category.schema';
import type { ProductFormInput } from '@/lib/validation/product.schema';

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowedFormats: string;
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
  uploads: {
    sign: () => postJson<UploadSignature>(`${BASE}/uploads/sign`),
  },
};
