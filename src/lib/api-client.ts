// Seul endroit du navigateur qui appelle NOTRE API : les composants n'utilisent jamais fetch() directement.
import type { ApiResult } from './api-result';

const NETWORK_FAILURE = {
  ok: false,
  error: {
    code: 'NETWORK_ERROR',
    message: 'Connexion impossible. Vérifie ta connexion internet et réessaie.',
    retryable: true,
  },
} as const;

type JsonMethod = 'POST' | 'PUT' | 'DELETE';

export interface RequestOptions {
  /** Abandonne la requête au bout de ce délai : sur une mauvaise 4G, mieux vaut proposer « Réessayer » qu'attendre sans fin. */
  timeoutMs?: number;
}

async function requestJson<TData>(method: JsonMethod, url: string, body?: unknown, options: RequestOptions = {}): Promise<ApiResult<TData>> {
  try {
    const canTimeout = options.timeoutMs !== undefined && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function';
    const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      ...(canTimeout ? { signal: AbortSignal.timeout(options.timeoutMs as number) } : {}),
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (typeof payload === 'object' && payload !== null && 'ok' in payload) {
      return payload as ApiResult<TData>;
    }
    return NETWORK_FAILURE;
  } catch {
    return NETWORK_FAILURE;
  }
}

export const postJson = <TData>(url: string, body: unknown = {}, options?: RequestOptions) => requestJson<TData>('POST', url, body, options);
export const putJson = <TData>(url: string, body: unknown) => requestJson<TData>('PUT', url, body);
export const deleteJson = <TData>(url: string) => requestJson<TData>('DELETE', url);
export { NETWORK_FAILURE };
