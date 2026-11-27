import { storeSettingsSchema } from '@/lib/validation/settings.schema';
import { requireOwnerApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { updateStoreSettings } from '@/server/services/settings.service';

export const dynamic = 'force-dynamic';

/** Paramètres de la boutique : réservés au compte propriétaire. */
export const PUT = withApi(async (request) => {
  assertSameOrigin(request);
  const admin = await requireOwnerApi();
  const input = storeSettingsSchema.parse(await readJson(request));
  const { changed } = await updateStoreSettings(input, admin);
  return jsonOk({ changed: changed.length });
});
