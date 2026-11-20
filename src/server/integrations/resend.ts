import { getServerEnv } from '@/lib/env';

// Client Resend minimal (API REST, sans SDK) : un seul endpoint, `POST /emails`. Vérifié sur la documentation :
// Authorization Bearer, en-tête Idempotency-Key (256 caractères au plus, valable 24 h), pièces jointes en base64, et un
// User-Agent OBLIGATOIRE (Resend répond 403 sans). Le transport est injectable : les tests ne touchent jamais le réseau.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const USER_AGENT = 'boutique-ecommerce/0.7 (AKATech)';
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_ERROR_LENGTH = 300;

/** « contact@domaine.com » ou « Nom <contact@domaine.com> » : ce que Resend accepte comme expéditeur. */
const FROM_PATTERN = /^(?:[^<>@]+<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>|[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)$/;

export interface EmailConfig {
  apiKey: string;
  from: string;
}

/** null tant que RESEND_API_KEY et un EMAIL_FROM valide ne sont pas fournis : les emails restent alors en attente. */
export function getEmailConfig(): EmailConfig | null {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return null;
  if (!FROM_PATTERN.test(env.EMAIL_FROM.trim())) return null;
  return { apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM.trim() };
}

export interface OutgoingEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** `content` : fichier encodé en base64 (jamais une URL `data:`). */
  attachments?: { filename: string; content: string }[];
  idempotencyKey: string;
}

export interface EmailTransport {
  send(email: OutgoingEmail, options?: { timeoutMs?: number }): Promise<{ id: string }>;
}

export class EmailSendError extends Error {
  constructor(
    message: string,
    /** Réessayer a un sens (réseau, limite, panne de Resend, configuration à corriger). */
    readonly retryable: boolean,
    readonly status: number | null,
    readonly code: string | null,
  ) {
    super(message);
    this.name = 'EmailSendError';
  }
}

/**
 * 408, 409, 425, 429 et 5xx : passagers. 401 et 403 (clé ou domaine non vérifié) : une erreur de configuration qui se
 * corrige, donc on réessaie. Le reste (422 : adresse ou contenu refusés) ne changera pas en réessayant.
 */
export const isRetryableStatus = (status: number): boolean => [401, 403, 408, 409, 425, 429].includes(status) || status >= 500;

/** Retire toute clé d'API qui aurait traîné dans un message, et borne la longueur (ce texte est stocké et affiché). */
export function scrubError(message: string): string {
  return message.replace(/\bre_[A-Za-z0-9_]+/g, '[clé masquée]').replace(/\s+/g, ' ').trim().slice(0, MAX_ERROR_LENGTH);
}

export function createResendTransport(apiKey: string, fetchImpl: typeof fetch = fetch): EmailTransport {
  return {
    async send(email, options = {}) {
      const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const payload = {
        from: email.from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        ...(email.attachments && email.attachments.length > 0 ? { attachments: email.attachments } : {}),
      };

      let response: Response;
      try {
        response = await fetchImpl(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT,
            'Idempotency-Key': email.idempotencyKey,
          },
          body: JSON.stringify(payload),
          signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : null,
        });
      } catch (error) {
        const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
        throw new EmailSendError(timedOut ? 'Resend n’a pas répondu à temps.' : 'Resend est injoignable.', true, null, timedOut ? 'timeout' : 'network');
      }

      if (response.ok) {
        const body = (await response.json().catch(() => null)) as { id?: unknown } | null;
        if (!body || typeof body.id !== 'string') throw new EmailSendError('Réponse de Resend illisible.', true, response.status, 'bad_response');
        return { id: body.id };
      }

      const error = (await response.json().catch(() => null)) as { name?: unknown; message?: unknown } | null;
      const code = typeof error?.name === 'string' ? error.name : null;
      const detail = typeof error?.message === 'string' ? error.message : `HTTP ${response.status}`;
      throw new EmailSendError(scrubError(`Resend ${response.status}${code ? ` (${code})` : ''} : ${detail}`), isRetryableStatus(response.status), response.status, code);
    },
  };
}
