import { anonymizeCustomerSchema } from '@/lib/validation/customer-data.schema';
import { requireOwnerApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { anonymizeCustomerByPhone } from '@/server/services/customer-data.service';

export const dynamic = 'force-dynamic';

/**
 * Effacement d'un client sur sa demande (cahier §10.2). Réservé au compte propriétaire. Anonymise (ne supprime pas) :
 * les commandes gardent leurs montants et leurs dates. 409 tant qu'une commande est en cours.
 */
export const POST = withApi(async (request) => {
  assertSameOrigin(request);
  const admin = await requireOwnerApi();
  const input = anonymizeCustomerSchema.parse(await readJson(request));

  const result = await anonymizeCustomerByPhone({ dialCode: input.phoneDialCode, phone: input.phone, adminUserId: admin.id });
  return jsonOk({ anonymized: !result.alreadyAnonymized, orders: result.orders });
});
