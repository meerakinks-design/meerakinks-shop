import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { ApiError, ApiErrorCode, ApiFieldErrors, ApiResult } from '@/lib/api-result';
import { logError } from '@/server/logger';

const DEFAULT_JSON_LIMIT_BYTES = 10_000;

export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly retryable: boolean;
  readonly fields: ApiFieldErrors | undefined;
  readonly retryAfterSeconds: number | undefined;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    options: { retryable?: boolean; fields?: ApiFieldErrors; retryAfterSeconds?: number } = {},
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.fields = options.fields;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function jsonOk<TData>(data: TData, status = 200): NextResponse {
  const body: ApiResult<TData> = { ok: true, data };
  return NextResponse.json(body, { status });
}

function jsonFailure(status: number, error: ApiError, retryAfterSeconds?: number): NextResponse {
  const headers = new Headers();
  if (retryAfterSeconds) headers.set('Retry-After', String(retryAfterSeconds));
  const body: ApiResult<never> = { ok: false, error };
  return NextResponse.json(body, { status, headers });
}

/**
 * Enveloppe commune des routes : format d'erreur standard, jamais de détail technique
 * côté client (seulement une référence), journal structuré côté serveur.
 */
export function withApi<TContext = unknown>(handler: (request: Request, context: TContext) => Promise<Response>) {
  return async (request: Request, context: TContext): Promise<Response> => {
    const requestId = crypto.randomUUID();
    let response: Response;
    try {
      response = await handler(request, context);
    } catch (error) {
      response = toErrorResponse(error, request, requestId);
    }
    response.headers.set('X-Request-Id', requestId);
    return response;
  };
}

function toErrorResponse(error: unknown, request: Request, requestId: string): NextResponse {
  if (error instanceof HttpError) {
    return jsonFailure(
      error.status,
      { code: error.code, message: error.message, retryable: error.retryable, fields: error.fields, requestId },
      error.retryAfterSeconds,
    );
  }
  if (error instanceof ZodError) {
    return jsonFailure(422, {
      code: 'VALIDATION_ERROR',
      message: 'Certaines informations sont invalides.',
      retryable: false,
      fields: error.flatten().fieldErrors,
      requestId,
    });
  }
  logError('api.unhandled_error', { requestId, method: request.method, path: new URL(request.url).pathname }, error);
  return jsonFailure(500, {
    code: 'INTERNAL_ERROR',
    message: `Une erreur est survenue. Référence : ${requestId.slice(0, 8)}`,
    retryable: true,
    requestId,
  });
}

/**
 * Protection CSRF pour les requêtes qui modifient des données : le cookie est SameSite=Lax,
 * et on exige en plus que l'origine déclarée par le navigateur soit notre propre site.
 * Un client hors navigateur (curl, tests) n'envoie ni Origin ni Sec-Fetch-Site : il passe.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');

  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new HttpError(403, 'INVALID_ORIGIN', 'Requête refusée.');
    }
    const requestHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    if (originHost !== requestHost) throw new HttpError(403, 'INVALID_ORIGIN', 'Requête refusée.');
    return;
  }
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    throw new HttpError(403, 'INVALID_ORIGIN', 'Requête refusée.');
  }
}

/** IP du client. Sur Vercel, x-forwarded-for est posé par la plateforme (une valeur envoyée par le client est écrasée). */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || headers.get('x-real-ip')?.trim() || 'unknown';
}

export const getClientIp = (request: Request): string => clientIpFromHeaders(request.headers);

/** Lit un corps JSON avec une taille maximale : jamais de payload illimité sur un endpoint. */
export async function readJson(request: Request, maxBytes = DEFAULT_JSON_LIMIT_BYTES): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Le contenu doit être au format JSON.');
  }
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Requête trop volumineuse.');

  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Requête trop volumineuse.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Le contenu envoyé n’est pas un JSON valide.');
  }
}
