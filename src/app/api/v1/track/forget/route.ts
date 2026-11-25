import { TRACK_BODY_MAX_BYTES, TRACK_RATE_LIMIT } from '@/lib/analytics/events';
import { visitorKeyBodySchema } from '@/lib/validation/track.schema';
import { hashIdentifier } from '@/server/auth/tokens';
import { HttpError, assertSameOrigin, getClientIp, jsonOk, readJson, withApi } from '@/server/http';
import { forgetVisitor } from '@/server/services/analytics.service';
import { consumeRateLimit } from '@/server/services/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Appelée quand le visiteur REFUSE la mesure après l'avoir acceptée : efface ce qui a été enregistré pour son
 * navigateur. Elle n'exige pas le consentement (au contraire : elle s'exécute au refus) ; l'identifiant est aléatoire
 * (128 bits) et ne permet de supprimer que la ligne du navigateur qui le présente.
 */
export const POST = withApi(async (request) => {
  assertSameOrigin(request);
  const { limit, windowSeconds } = TRACK_RATE_LIMIT;
  const attempt = await consumeRateLimit(`track:ip:${hashIdentifier(getClientIp(request))}`, limit, windowSeconds);
  if (!attempt.allowed) throw new HttpError(429, 'RATE_LIMITED', 'Trop de requêtes.', { retryable: true, retryAfterSeconds: attempt.retryAfterSeconds });

  const { visitorKey } = visitorKeyBodySchema.parse(await readJson(request, TRACK_BODY_MAX_BYTES));
  return jsonOk({ erased: (await forgetVisitor(visitorKey)) > 0 });
});
