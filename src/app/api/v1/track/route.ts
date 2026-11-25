import { geoFromHeaders, parseUserAgent } from '@/lib/analytics/classify';
import { TRACK_BODY_MAX_BYTES, TRACK_RATE_LIMIT } from '@/lib/analytics/events';
import { mayCollect } from '@/lib/analytics/server-guard';
import { trackBodySchema } from '@/lib/validation/track.schema';
import { hashIdentifier } from '@/server/auth/tokens';
import { HttpError, assertSameOrigin, getClientIp, jsonOk, readJson, withApi } from '@/server/http';
import { recordTrackEvent } from '@/server/services/analytics.service';
import { consumeRateLimit } from '@/server/services/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Collecte d'un événement de l'analytique maison (cahier §7.6). Ordre des garde-fous : origine, mesure activée,
 * consentement, robot, limite par IP, taille et forme du corps (liste fermée), puis enregistrement. Ni l'adresse IP
 * ni le user-agent ne sont conservés : seul leur résultat grossier (pays/région/ville, appareil) l'est.
 */
export const POST = withApi(async (request) => {
  assertSameOrigin(request);
  if (!mayCollect(request.headers)) return jsonOk({ recorded: false });

  const { limit, windowSeconds } = TRACK_RATE_LIMIT;
  const attempt = await consumeRateLimit(`track:ip:${hashIdentifier(getClientIp(request))}`, limit, windowSeconds);
  if (!attempt.allowed) throw new HttpError(429, 'RATE_LIMITED', 'Trop de requêtes.', { retryable: true, retryAfterSeconds: attempt.retryAfterSeconds });

  const body = trackBodySchema.parse(await readJson(request, TRACK_BODY_MAX_BYTES));
  const result = await recordTrackEvent(body, {
    geo: geoFromHeaders(request.headers),
    device: parseUserAgent(request.headers.get('user-agent')),
    selfHost: request.headers.get('host'),
  });
  return jsonOk({ recorded: result.recorded });
});
