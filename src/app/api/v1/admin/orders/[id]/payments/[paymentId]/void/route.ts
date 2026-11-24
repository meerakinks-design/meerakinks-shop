import { voidPaymentSchema } from '@/lib/validation/order-admin.schema';
import { requireAdminApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { voidPayment } from '@/server/services/orders-admin.service';

export const dynamic = 'force-dynamic';

/** Annule un paiement saisi par erreur (RM-21) : la ligne reste en base, avec la date et le motif. */
export const POST = withApi(async (request, context: { params: { id: string; paymentId: string } }) => {
  assertSameOrigin(request);
  const admin = await requireAdminApi();
  const { reason } = voidPaymentSchema.parse(await readJson(request));
  return jsonOk(await voidPayment({ orderId: context.params.id, paymentId: context.params.paymentId, reason, admin }));
});
