import { requireAdminApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, withApi } from '@/server/http';
import { resendOrderEmail } from '@/server/services/orders-admin.service';

export const dynamic = 'force-dynamic';

/** Relance un email abandonné de la commande (bouton « Renvoyer » de la fiche commande). */
export const POST = withApi(async (request, context: { params: { id: string; emailId: string } }) => {
  assertSameOrigin(request);
  const admin = await requireAdminApi();
  return jsonOk(await resendOrderEmail({ orderId: context.params.id, emailId: context.params.emailId, admin }));
});
