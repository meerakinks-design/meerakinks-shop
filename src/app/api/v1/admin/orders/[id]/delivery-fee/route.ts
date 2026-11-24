import { deliveryFeeSchema } from '@/lib/validation/order-admin.schema';
import { requireAdminApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { setDeliveryFee } from '@/server/services/orders-admin.service';

export const dynamic = 'force-dynamic';

/** Fixe les frais de livraison : le total n'existe qu'à partir de là (RM-03, RM-06). */
export const PUT = withApi(async (request, context: { params: { id: string } }) => {
  assertSameOrigin(request);
  const admin = await requireAdminApi();
  const { fee } = deliveryFeeSchema.parse(await readJson(request));
  return jsonOk(await setDeliveryFee({ orderId: context.params.id, fee, admin }));
});
