import { cartQuoteSchema } from '@/lib/validation/cart.schema';
import { hashIdentifier } from '@/server/auth/tokens';
import { HttpError, assertSameOrigin, getClientIp, jsonOk, readJson, withApi } from '@/server/http';
import { quoteCart } from '@/server/services/quote.service';
import { consumeRateLimit } from '@/server/services/rate-limit';

export const dynamic = 'force-dynamic';

const QUOTES_PER_WINDOW = 120;
const WINDOW_SECONDS = 600;

/** Devis public du panier : les prix officiels viennent de la base, jamais du navigateur. */
export const POST = withApi(async (request) => {
  assertSameOrigin(request);

  const limit = await consumeRateLimit(`quote:ip:${hashIdentifier(getClientIp(request))}`, QUOTES_PER_WINDOW, WINDOW_SECONDS);
  if (!limit.allowed) {
    throw new HttpError(429, 'RATE_LIMITED', 'Trop de requêtes. Réessaie dans quelques instants.', {
      retryable: true,
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const input = cartQuoteSchema.parse(await readJson(request));
  return jsonOk(await quoteCart(input.items));
});
