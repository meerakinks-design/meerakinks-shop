import { requireAdminApi } from '@/server/auth/guards';
import { HttpError, assertSameOrigin, jsonOk, withApi } from '@/server/http';
import { createUploadSignature } from '@/server/integrations/cloudinary';
import { consumeRateLimit } from '@/server/services/rate-limit';

export const dynamic = 'force-dynamic';

const SIGNATURES_PER_HOUR = 60;

export const POST = withApi(async (request) => {
  assertSameOrigin(request);
  const admin = await requireAdminApi();

  const limit = await consumeRateLimit(`upload-sign:${admin.id}`, SIGNATURES_PER_HOUR, 3600);
  if (!limit.allowed) {
    throw new HttpError(429, 'RATE_LIMITED', 'Trop d’envois de photos. Réessaie dans quelques minutes.', {
      retryable: true,
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }
  return jsonOk(createUploadSignature());
});
