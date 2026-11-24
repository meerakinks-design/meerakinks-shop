import { CONTACT_RATE_LIMITED_MESSAGE, CONTACT_FORM_UNAVAILABLE_MESSAGE } from '@/content/contact-messages';
import { CONTACT_RATE_LIMITS } from '@/lib/constants/contact';
import { CONTACT_FORM_ENABLED } from '@/lib/constants/features';
import { contactInputSchema } from '@/lib/validation/contact.schema';
import { hashIdentifier } from '@/server/auth/tokens';
import { HttpError, assertSameOrigin, getClientIp, jsonOk, readJson, withApi } from '@/server/http';
import { logInfo } from '@/server/logger';
import { sendContactMessage } from '@/server/services/contact.service';
import { consumeRateLimit } from '@/server/services/rate-limit';

export const dynamic = 'force-dynamic';

async function enforceRateLimit(key: string, rule: { limit: number; windowSeconds: number }): Promise<void> {
  const result = await consumeRateLimit(key, rule.limit, rule.windowSeconds);
  if (!result.allowed) {
    throw new HttpError(429, 'RATE_LIMITED', CONTACT_RATE_LIMITED_MESSAGE, { retryable: true, retryAfterSeconds: result.retryAfterSeconds });
  }
}

/** Champ piège : un humain ne le voit pas, un robot le remplit. */
function isHoneypotFilled(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const value = (body as { companyFax?: unknown }).companyFax;
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Message d'un client à la vendeuse. Garde-fous dans l'ordre : interrupteur, origine, limite par IP, taille et type du
 * corps, champ piège (faux succès, rien d'envoyé), validation, limite par contact, puis envoi par Resend.
 */
export const POST = withApi(async (request) => {
  if (!CONTACT_FORM_ENABLED) throw new HttpError(503, 'SERVICE_UNAVAILABLE', CONTACT_FORM_UNAVAILABLE_MESSAGE);
  assertSameOrigin(request);
  await enforceRateLimit(`contact:ip:${hashIdentifier(getClientIp(request))}`, CONTACT_RATE_LIMITS.perIp);

  const body = await readJson(request);
  if (isHoneypotFilled(body)) {
    logInfo('contact.honeypot');
    return jsonOk({ sent: true }, 201);
  }

  const input = contactInputSchema.parse(body);
  await enforceRateLimit(`contact:who:${hashIdentifier(input.phoneE164 ?? input.email ?? input.name)}`, CONTACT_RATE_LIMITS.perContact);
  await sendContactMessage(input);
  return jsonOk({ sent: true }, 201);
});
