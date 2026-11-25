import { deliveryNotesSchema } from '@/lib/validation/delivery-zone.schema';
import { requireOwnerApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { updateDeliveryNotes } from '@/server/services/delivery-zones.service';

export const dynamic = 'force-dynamic';

export const PUT = withApi(async (request) => {
  assertSameOrigin(request);
  await requireOwnerApi();
  const input = deliveryNotesSchema.parse(await readJson(request));
  await updateDeliveryNotes(input);
  return jsonOk({});
});
