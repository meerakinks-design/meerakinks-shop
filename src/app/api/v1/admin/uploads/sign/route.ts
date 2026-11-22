import { z } from 'zod';
import { UPLOAD_KINDS } from '@/lib/constants/images';
import { requireAdminApi } from '@/server/auth/guards';
import { HttpError, assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { createUploadSignature } from '@/server/integrations/cloudinary';
import { consumeRateLimit } from '@/server/services/rate-limit';

export const dynamic = 'force-dynamic';

const SIGNATURES_PER_HOUR = 60;
const bodySchema = z.object({ kind: z.enum(UPLOAD_KINDS).default('image') }).strict();

export const POST = withApi(async (request) => {
  assertSameOrigin(request);
  const admin = await requireAdminApi();

  const limit = await consumeRateLimit(`upload-sign:${admin.id}`, SIGNATURES_PER_HOUR, 3600);
  if (!limit.allowed) {
    throw new HttpError(429, 'RATE_LIMITED', 'Trop d’envois de médias. Réessaie dans quelques minutes.', {
      retryable: true,
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(422, 'VALIDATION_ERROR', 'Type de média inconnu.');
  return jsonOk(createUploadSignature(Date.now(), parsed.data.kind));
});
