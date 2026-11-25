import { deliveryZoneInputSchema } from '@/lib/validation/delivery-zone.schema';
import { requireOwnerApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { createDeliveryZone } from '@/server/services/delivery-zones.service';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (request) => {
  assertSameOrigin(request);
  await requireOwnerApi();
  const input = deliveryZoneInputSchema.parse(await readJson(request));
  return jsonOk(await createDeliveryZone(input), 201);
});
