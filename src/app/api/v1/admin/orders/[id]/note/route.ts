import { internalNoteSchema } from '@/lib/validation/order-admin.schema';
import { requireAdminApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { setInternalNote } from '@/server/services/orders-admin.service';

export const dynamic = 'force-dynamic';

/** Note interne : visible de l'équipe uniquement, jamais du client. */
export const PUT = withApi(async (request, context: { params: { id: string } }) => {
  assertSameOrigin(request);
  await requireAdminApi();
  const { note } = internalNoteSchema.parse(await readJson(request));
  await setInternalNote({ orderId: context.params.id, note });
  return jsonOk({ note });
});
