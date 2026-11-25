import { TRACK_BODY_MAX_BYTES, TRACK_RATE_LIMIT } from '@/lib/analytics/events';
import { mayCollect } from '@/lib/analytics/server-guard';
import { visitorKeyBodySchema } from '@/lib/validation/track.schema';
import { hashIdentifier } from '@/server/auth/tokens';
import { HttpError, assertSameOrigin, getClientIp, jsonOk, readJson, withApi } from '@/server/http';
import { recordArrival } from '@/server/services/analytics.service';
import { sendVisitorAlertNow } from '@/server/services/notifications.service';
import { consumeRateLimit } from '@/server/services/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * Signale l'arrivée d'un navigateur qui a accepté la mesure : crée l'alerte « Nouvelle visite » (une seule par
 * navigateur, plafonnée par jour) puis tente l'envoi tout de suite ; sans clé Resend ou en cas d'échec, le cron reprend.
 */
export const POST = withApi(async (request) => {
  assertSameOrigin(request);
  if (!mayCollect(request.headers)) return jsonOk({ outcome: 'ignored' });

  const { limit, windowSeconds } = TRACK_RATE_LIMIT;
  const attempt = await consumeRateLimit(`track:ip:${hashIdentifier(getClientIp(request))}`, limit, windowSeconds);
  if (!attempt.allowed) throw new HttpError(429, 'RATE_LIMITED', 'Trop de requêtes.', { retryable: true, retryAfterSeconds: attempt.retryAfterSeconds });

  const { visitorKey } = visitorKeyBodySchema.parse(await readJson(request, TRACK_BODY_MAX_BYTES));
  const result = await recordArrival(visitorKey);
  if (result.outcome === 'queued' && result.dedupeKey) await sendVisitorAlertNow(result.dedupeKey);
  return jsonOk({ outcome: result.outcome });
});
