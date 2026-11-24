import { paymentInputSchema } from '@/lib/validation/order-admin.schema';
import { requireAdminApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { recordPayment } from '@/server/services/orders-admin.service';

export const dynamic = 'force-dynamic';

/** Enregistre un encaissement ou un remboursement (RM-20 : une ligne par opération). */
export const POST = withApi(async (request, context: { params: { id: string } }) => {
  assertSameOrigin(request);
  const admin = await requireAdminApi();
  const payment = paymentInputSchema.parse(await readJson(request));
  return jsonOk(await recordPayment({ orderId: context.params.id, payment, admin }), 201);
});
