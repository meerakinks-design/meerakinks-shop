import { deliveryZoneInputSchema } from '@/lib/validation/delivery-zone.schema';
import { requireOwnerApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { deleteDeliveryZone, updateDeliveryZone } from '@/server/services/delivery-zones.service';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export const PUT = withApi<RouteContext>(async (request, { params }) => {
  assertSameOrigin(request);
  await requireOwnerApi();
  const input = deliveryZoneInputSchema.parse(await readJson(request));
  return jsonOk(await updateDeliveryZone(params.id, input));
});

export const DELETE = withApi<RouteContext>(async (request, { params }) => {
  assertSameOrigin(request);
  await requireOwnerApi();
  await deleteDeliveryZone(params.id);
  return jsonOk({});
});
