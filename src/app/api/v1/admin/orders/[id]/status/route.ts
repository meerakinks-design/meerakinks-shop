import { deliveryStatusInputSchema } from '@/lib/validation/order-admin.schema';
import { requireAdminApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { changeDeliveryStatus } from '@/server/services/orders-admin.service';

export const dynamic = 'force-dynamic';

/** Fait avancer ou annule une commande (RM-16, RM-18). L'annulation remet le stock suivi en rayon. */
export const POST = withApi(async (request, context: { params: { id: string } }) => {
  assertSameOrigin(request);
  const admin = await requireAdminApi();
  const input = deliveryStatusInputSchema.parse(await readJson(request));
  return jsonOk(await changeDeliveryStatus({ orderId: context.params.id, to: input.status, note: input.note, admin }));
});
