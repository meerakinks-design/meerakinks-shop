// Format de réponse standard de toutes les routes /api/v1 (contrat partagé client / serveur).

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'INVALID_ORIGIN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_ERROR'; // produit côté navigateur uniquement, quand la requête n'aboutit pas

export type ApiFieldErrors = Record<string, string[] | undefined>;

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  /** true : réessayer a un sens (erreur réseau, limite de débit, panne passagère). */
  retryable: boolean;
  fields?: ApiFieldErrors;
  requestId?: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
