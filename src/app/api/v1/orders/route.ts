import { ORDER_RATE_LIMITS } from '@/lib/constants/order';
import { CHECKOUT_ENABLED } from '@/lib/constants/features';
import { orderInputSchema } from '@/lib/validation/order.schema';
import { hashIdentifier } from '@/server/auth/tokens';
import { HttpError, assertSameOrigin, getClientIp, jsonOk, readJson, withApi } from '@/server/http';
import { logInfo } from '@/server/logger';
import { sendOrderEmailsNow } from '@/server/services/notifications.service';
import { createOrder, decoyOrder } from '@/server/services/orders.service';
import { consumeRateLimit } from '@/server/services/rate-limit';

export const dynamic = 'force-dynamic';

async function enforceRateLimit(key: string, rule: { limit: number; windowSeconds: number }): Promise<void> {
  const result = await consumeRateLimit(key, rule.limit, rule.windowSeconds);
  if (!result.allowed) {
    throw new HttpError(429, 'RATE_LIMITED', 'Trop de commandes envoyées. Réessayez dans quelques minutes.', {
      retryable: true,
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
}

/** Champ piège : un humain ne le voit pas, un robot le remplit. */
function isHoneypotFilled(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const value = (body as { companyFax?: unknown }).companyFax;
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Enregistre une commande (cahier §6.3). Garde-fous dans l'ordre : origine, interrupteur, limite par IP, taille et
 * type du corps, champ piège, validation, limite par téléphone, puis service (idempotence + transaction unique), puis
 * tentative d'envoi des emails (jamais bloquante).
 */
export const POST = withApi(async (request) => {
  assertSameOrigin(request);
  if (!CHECKOUT_ENABLED) {
    throw new HttpError(503, 'SERVICE_UNAVAILABLE', 'La commande en ligne n’est pas encore ouverte.');
  }

  await enforceRateLimit(`order:ip:${hashIdentifier(getClientIp(request))}`, ORDER_RATE_LIMITS.perIp);

  const body = await readJson(request);
  if (isHoneypotFilled(body)) {
    logInfo('order.honeypot');
    return jsonOk(decoyOrder(), 201);
  }

  const input = orderInputSchema.parse(body);
  await enforceRateLimit(`order:phone:${hashIdentifier(input.phoneE164)}`, ORDER_RATE_LIMITS.perPhone);

  const { order, created } = await createOrder(input);
  // Cahier §6.3, point 4 : la commande est enregistrée, on TENTE l'envoi des emails ; en cas d'échec, le cron reprend.
  // Cette fonction ne lève jamais : un email indisponible ne fait pas échouer une commande déjà enregistrée.
  if (created) await sendOrderEmailsNow(order.reference);
  return jsonOk(order, created ? 201 : 200);
});
