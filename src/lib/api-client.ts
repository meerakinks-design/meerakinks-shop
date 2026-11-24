// Seul endroit du navigateur qui appelle NOTRE API : les composants n'utilisent jamais fetch() directement.
import type { ApiError, ApiResult } from './api-result';

const NETWORK_FAILURE = {
  ok: false,
  error: {
    code: 'NETWORK_ERROR',
    message: 'La connexion semble interrompue. Vérifiez votre réseau puis réessayez.',
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


export type DownloadResult = { ok: true; filename: string; headers: Headers } | { ok: false; error: ApiError };
export function filenameFromDisposition(header: string | null, fallback: string): string { const match = header ? /filename="([^"\\/\r\n]+)"/i.exec(header) : null; return match?.[1] ?? fallback; }
export async function downloadFile(url: string, fallbackFilename: string): Promise<DownloadResult> {
  try { const response = await fetch(url, { credentials: 'same-origin' }); if (!response.ok) { const payload = await response.json().catch(() => null) as any; return payload?.ok === false && payload.error ? { ok: false, error: payload.error } : NETWORK_FAILURE; } const blob = await response.blob(); const filename = filenameFromDisposition(response.headers.get('content-disposition'), fallbackFilename); const objectUrl = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = objectUrl; link.download = filename; link.rel = 'noopener'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000); return { ok: true, filename, headers: response.headers }; } catch { return NETWORK_FAILURE; }
}
